'use strict';

var info = document.getElementById('info');

var restore = () => chrome.storage.local.get({
  manualCheck: false,
  filter: true
}, prefs => {
  document.getElementById('filter').checked = prefs.filter;
  document.getElementById('manualCheck').checked = prefs.manualCheck;
});
restore();

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({
    filter: document.getElementById('filter').checked,
    manualCheck: document.getElementById('manualCheck').checked,
  }, () => {
    info.textContent = 'Options saved';
    window.setTimeout(() => info.textContent = '', 750);
    restore();
  });
});
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    info.textContent = 'Double-click to reset!';
    window.setTimeout(() => info.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));
