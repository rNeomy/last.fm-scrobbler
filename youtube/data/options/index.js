'use strict';

const toast = document.getElementById('toast');

const restore = () => chrome.storage.local.get({
  categories: ['Música', 'Music', 'Entertainment'],
  blacklistAuthors: [],
  checkCategory: true,
  manualCheck: false,
  filter: true,
  minTime: 240
}, prefs => {
  document.getElementById('checkCategory').checked = prefs.checkCategory;
  document.getElementById('filter').checked = prefs.filter;
  document.getElementById('manualCheck').checked = prefs.manualCheck;
  document.getElementById('categories').value = prefs.categories.join(', ');
  document.getElementById('blacklistAuthors').value = prefs.blacklistAuthors.join(', ');
  document.getElementById('minTime').value = prefs.minTime;
});
restore();

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({
    filter: document.getElementById('filter').checked,
    checkCategory: document.getElementById('checkCategory').checked,
    manualCheck: document.getElementById('manualCheck').checked,
    categories: document.getElementById('categories').value.split(/\s*,\s*/).filter((s, i, l) => s && l.indexOf(s) === i),
    blacklistAuthors: document.getElementById('blacklistAuthors').value.split(/\s*,\s*/).filter((s, i, l) => s && l.indexOf(s) === i),
    minTime: +document.getElementById('minTime').value
  }, () => {
    toast.textContent = 'Options saved';
    window.setTimeout(() => toast.textContent = '', 750);
    restore();
  });
});
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
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
