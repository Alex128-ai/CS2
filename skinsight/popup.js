document.getElementById('delay').addEventListener('input', e => {
  document.getElementById('delayValue').textContent = e.target.value;
});

const toggleBtn = document.getElementById('toggle');

chrome.storage.local.get(['running', 'delay', 'mode'], data => {
  toggleBtn.textContent = data.running ? 'Stop' : 'Start';
  if (data.delay) {
    document.getElementById('delay').value = data.delay;
    document.getElementById('delayValue').textContent = data.delay;
  }
  if (data.mode) {
    document.getElementById('mode').value = data.mode;
  }
});

toggleBtn.addEventListener('click', () => {
  chrome.storage.local.get('running', ({ running }) => {
    const newState = !running;
    chrome.storage.local.set({ running: newState });
    toggleBtn.textContent = newState ? 'Stop' : 'Start';
    chrome.runtime.sendMessage({ action: newState ? 'start' : 'stop' });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.status) {
    document.getElementById('status').textContent = msg.status;
  }
});
