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

{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': /Firefox/.test(navigator.userAgent) === false,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '&version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
