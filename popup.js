document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const resumeButton = document.getElementById('resumeButton');
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delayValue');
  const exportButton = document.getElementById('exportButton');
  const resetButton = document.getElementById('resetButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const allCount = document.getElementById('allCount');
  const consoleOutput = document.getElementById('consoleOutput');
  
  // Initialiser le délai
  delayValue.textContent = `${delaySlider.value} ms`;
  delaySlider.addEventListener('input', () => {
    delayValue.textContent = `${delaySlider.value} ms`;
  });
  
  let running = false;

  chrome.storage.local.get(['friendLinks', 'currentIndex'], (data) => {
    if (data.friendLinks && data.friendLinks.length > (data.currentIndex || 0)) {
      resumeButton.style.display = 'block';
    }
  });

  // Gérer le bouton de démarrage/arrêt
  toggleButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('steamcommunity.com')) {
      alert("Veuillez d'abord ouvrir votre liste d'amis Steam.\nExemple: https://steamcommunity.com/id/votrepseudo/friends/");
      return;
    }

    running = !running;
    toggleButton.textContent = running ? 'Arrêter' : 'Démarrer';

    if (running) {
      clearConsole();
      chrome.storage.local.set({ delay: delaySlider.value });
      chrome.runtime.sendMessage({ action: "start", tabId: tab.id });
      resumeButton.style.display = 'none';
    } else {
      chrome.runtime.sendMessage({ action: "pause" });
      resumeButton.style.display = 'block';
    }
  });

  resumeButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    running = true;
    toggleButton.textContent = 'Arrêter';
    resumeButton.style.display = 'none';
    chrome.runtime.sendMessage({ action: 'resume', tabId: tab.id });
  });
  
  // Mettre à jour le compteur de profils
  function updateCount() {
    chrome.storage.local.get('allProfiles', (data) => {
      const all = data.allProfiles || [];
      allCount.textContent = `${all.length} profils analysés`;
    });
  }
  
  // Écouter les changements de stockage
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.allProfiles) {
      updateCount();
    }
  });
  
  // Écouter les mises à jour de progression
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      const percent = Math.round((message.current / message.total) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${message.current}/${message.total} (${percent}%)`;
      
      if (message.current === message.total) {
        progressText.textContent = "Terminé !";
      }
    }
    else if (message.action === "log") {
      addLog(message.text, message.timestamp);
    }
  });
  
  // Bouton d'export
  exportButton.addEventListener('click', () => {
    chrome.storage.local.get('allProfiles', (data) => {
      const profiles = data.allProfiles || [];
      if (profiles.length === 0) {
        alert("Aucune donnée à exporter !");
        return;
      }
      
      let csv = 'Profil,Valeur,Caisses\n';
      profiles.forEach(profile => {
        csv += `"${profile.url}",${profile.value},${profile.cases}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `steam_inventories_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addLog("Données exportées en CSV");
    });
  });
  
  // Bouton de réinitialisation
  resetButton.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment réinitialiser toutes les données ?")) {
      chrome.runtime.sendMessage({ action: "resetData" });
      allProfiles = [];
      updateCount();
      progressBar.style.width = `0%`;
      progressText.textContent = "En attente...";
      addLog("Données réinitialisées");
      resumeButton.style.display = 'none';
    }
  });
  
  // Ajouter un message à la console
  function addLog(message, timestamp = new Date().toLocaleTimeString()) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    consoleOutput.appendChild(logEntry);
    
    // Effet Matrix
    logEntry.style.opacity = '0';
    setTimeout(() => {
      logEntry.style.opacity = '1';
      logEntry.style.textShadow = '0 0 5px #00ff00';
    }, 10);
    
    setTimeout(() => {
      logEntry.style.textShadow = 'none';
    }, 500);
    
    // Défilement automatique
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
  
  // Effacer la console
  function clearConsole() {
    consoleOutput.innerHTML = '';
  }
  
  // Initialiser le compteur
  updateCount();
  addLog("Prêt à scanner");
});
