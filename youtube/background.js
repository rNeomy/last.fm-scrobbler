/* globals lastfm */
'use strict';

chrome.runtime.onMessage.addListener((request, sender, response) => {
  switch (request.method) {
    case 'track.scrobble':
    case 'track.love':
    case 'track.unlove':
    case 'track.getInfo':
      lastfm.call(request).then(response, response);
      return true;
  }
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1,
  'last-update': 0,
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    (new URL(chrome.runtime.getManifest().homepage_url)).origin +
      '/feedback.html?name=' + name + '&version=' + version
  );
}
