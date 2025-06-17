const delayInput = document.getElementById('delay');
const modeSelect = document.getElementById('mode');

delayInput.addEventListener('input', e => {
  document.getElementById('delayValue').textContent = e.target.value;
});

delayInput.addEventListener('change', e => {
  chrome.storage.local.set({ delay: parseInt(e.target.value, 10) });
});

modeSelect.addEventListener('change', e => {
  chrome.storage.local.set({ mode: e.target.value });
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
    chrome.runtime.sendMessage({
      action: newState ? 'start' : 'stop',
      delay: parseInt(delayInput.value, 10),
      mode: modeSelect.value
    });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.status) {
    document.getElementById('status').textContent = msg.status;
  }
});
