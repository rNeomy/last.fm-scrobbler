'use strict';

var restore = () => chrome.storage.local.get({
  categories: ['Música', 'Music', 'Entertainment'],
  checkCategory: true
}, prefs => {
  document.getElementById('checkCategory').checked = prefs.checkCategory;
  document.getElementById('categories').value = prefs.categories.join(', ');
});
restore();

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({
    checkCategory: document.getElementById('checkCategory').checked,
    categories: document.getElementById('categories').value.split(/\s*,\s*/).filter((s, i, l) => l.indexOf(s) === i)
  }, () => {
    const info = document.getElementById('info');
    info.textContent = 'Options saved';
    window.setTimeout(() => info.textContent = '', 750);
    restore();
  });
});
document.getElementById('reset').addEventListener('click', () => {
  chrome.storage.local.set({
    categories: ['Música', 'Music', 'Entertainment'],
    checkCategory: true
  }, () => {
    restore();
  });
});
