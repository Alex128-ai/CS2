function getFriends() {
  const links = [];
  document.querySelectorAll('a.friendBlockLinkOverlay').forEach(a => {
    const url = a.href;
    if (!url.includes(location.pathname)) {
      links.push(url);
    }
  });
  return links;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'collect') {
    sendResponse({ friends: getFriends() });
  }
});
