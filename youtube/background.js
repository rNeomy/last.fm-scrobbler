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
  'faqs': navigator.userAgent.indexOf('Firefox') === -1
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/lastfm-tool.html?from=youtube&version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
