let timer = null;
let currentIndex = 0;
let friendLinks = [];
let tabId = null;
let allProfiles = [];
let isPaused = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start") {
    tabId = message.tabId;
    chrome.storage.local.get(['delay'], (result) => {
      startProcess(tabId, parseInt(result.delay) || 3000);
    });
  } else if (message.action === "stop") {
    stopProcess();
  } else if (message.action === "pause") {
    pauseProcess();
  } else if (message.action === "resume") {
    tabId = message.tabId;
    chrome.storage.local.get(['delay'], (result) => {
      resumeProcess(tabId, parseInt(result.delay) || 3000);
    });
  } else if (message.action === "resetData") {
    allProfiles = [];
    chrome.storage.local.set({ allProfiles });
  } else if (message.action === "log") {
    chrome.runtime.sendMessage(message);
  }
});

function startProcess(tabId, delay) {
  stopProcess();
  isPaused = false;
  logMessage("Démarrage du scan...");
  
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const links = [];
      document.querySelectorAll('.selectable_overlay').forEach(el => {
        const href = el.getAttribute('href');
        if (href && !href.includes('/id/') && !href.includes('/friends')) {
          links.push(href.startsWith('https://') ? href : `https://steamcommunity.com${href}`);
        }
      });
      return links;
    }
  }, (results) => {
    if (results?.[0]?.result) {
      friendLinks = results[0].result;
      currentIndex = 0;
      allProfiles = [];
      chrome.storage.local.set({ friendLinks, currentIndex, allProfiles, scanState: 'running' });
      
      if (friendLinks.length > 0) {
        logMessage(`${friendLinks.length} profils trouvés`);
        chrome.runtime.sendMessage({ 
          action: "progress", 
          current: 0, 
          total: friendLinks.length 
        });
        if (!isPaused) processNextFriend(tabId, delay);
      } else {
        logMessage("Aucun profil trouvé");
      }
    }
  });
}

function stopProcess() {
  if (timer) clearTimeout(timer);
  timer = null;
  isPaused = false;
  currentIndex = 0;
  friendLinks = [];
  chrome.storage.local.set({ scanState: 'stopped', friendLinks: [], currentIndex: 0 });
}

function pauseProcess() {
  if (timer) clearTimeout(timer);
  timer = null;
  isPaused = true;
  chrome.storage.local.set({ friendLinks, currentIndex, allProfiles, scanState: 'paused' });
  logMessage('Scan mis en pause');
}

function resumeProcess(tabId, delay) {
  if (!friendLinks.length) {
    chrome.storage.local.get(['friendLinks', 'currentIndex', 'allProfiles'], (data) => {
      friendLinks = data.friendLinks || [];
      currentIndex = data.currentIndex || 0;
      allProfiles = data.allProfiles || [];
      if (!friendLinks.length) {
        logMessage('Aucune progression \u00e0 reprendre');
        return;
      }
      logMessage('Reprise du scan...');
      chrome.storage.local.set({ scanState: 'running' });
      if (!isPaused) processNextFriend(tabId, delay);
    });
  } else {
    logMessage('Reprise du scan...');
    chrome.storage.local.set({ scanState: 'running' });
    if (!isPaused) processNextFriend(tabId, delay);
  }
}

function processNextFriend(tabId, delay) {
  if (currentIndex >= friendLinks.length || !tabId) {
    logMessage("Scan terminé !");
    chrome.runtime.sendMessage({ 
      action: "progress", 
      current: friendLinks.length, 
      total: friendLinks.length 
    });
    stopProcess();
    return;
  }
  
  const baseUrl = friendLinks[currentIndex].split('/inventory')[0];
  const inventoryUrl = `${baseUrl}/inventory`;
  
  logMessage(`Scan du profil ${currentIndex + 1}/${friendLinks.length}: ${baseUrl}`);
  
  chrome.tabs.update(tabId, { url: inventoryUrl }, () => {
    timer = setTimeout(() => {
      // Détecter la valeur et les caisses
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Détection de la valeur
          let totalValue = 0;
          const priceContainer = document.querySelector('.platform_container.steam .price');
          if (priceContainer) {
            const priceText = priceContainer.textContent.trim();
            const match = priceText.match(/[\d,]+\.?\d*/);
            if (match) {
              totalValue = parseFloat(match[0].replace(',', ''));
            }
          }
          
          // Détection des caisses
          let caseCount = 0;
          const items = document.querySelectorAll('.item.app730');
          items.forEach(item => {
            const itemName = (item.getAttribute('data-market-hashname') || '').toLowerCase();
            if (itemName.includes('case') && !itemName.includes('key')) {
              caseCount++;
            }
          });
          
          return {
            value: totalValue,
            cases: caseCount
          };
        }
      }, (results) => {
        const data = results[0]?.result || { value: 0, cases: 0 };
        
        // Stocker le profil
        allProfiles.push({
          url: baseUrl,
          value: data.value,
          cases: data.cases
        });
        chrome.storage.local.set({ allProfiles, currentIndex, friendLinks });
        
        // Mettre à jour la progression
        chrome.runtime.sendMessage({ 
          action: "progress", 
          current: currentIndex + 1, 
          total: friendLinks.length 
        });
        
        // Log des résultats
        logMessage(`→ Valeur: ${data.value}€ | Caisses: ${data.cases}`);
        
        // Passer au profil suivant
        currentIndex++;
        chrome.storage.local.set({ friendLinks, currentIndex, allProfiles });
        if (!isPaused) processNextFriend(tabId, delay);
      });
    }, delay);
  });
}

function logMessage(message) {
  chrome.runtime.sendMessage({ 
    action: "log", 
    text: message,
    timestamp: new Date().toLocaleTimeString()
  });
}
