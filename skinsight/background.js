let delay = 5;
let mode = 'background';
let running = false;

chrome.storage.local.get(['delay', 'mode'], data => {
  if (data.delay) delay = data.delay;
  if (data.mode) mode = data.mode;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    running = true;
    scan();
  } else if (msg.action === 'stop') {
    running = false;
  }
});

async function scan() {
  chrome.runtime.sendMessage({ status: 'Scanning...' });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, async response => {
    if (!response || !response.friends) {
      chrome.runtime.sendMessage({ status: 'Aucun ami détecté' });
      running = false;
      return;
    }
    for (const url of response.friends) {
      if (!running) break;
      if (mode === 'background') {
        chrome.tabs.create({ url: url + '/inventory', active: false });
      } else if (mode === 'sequential') {
        const created = await chrome.tabs.create({ url: url + '/inventory', active: false });
        await new Promise(r => setTimeout(r, delay * 1000));
        chrome.tabs.remove(created.id);
      } else if (mode === 'api') {
        fetch(`https://steamcommunity.com/inventory/${url.split('/').pop()}/730/2`);
      }
      await new Promise(r => setTimeout(r, delay * 1000));
    }
    chrome.runtime.sendMessage({ status: 'Terminé' });
    running = false;
  });
}

chrome.storage.onChanged.addListener(changes => {
  if (changes.delay) delay = changes.delay.newValue;
  if (changes.mode) mode = changes.mode.newValue;
});
