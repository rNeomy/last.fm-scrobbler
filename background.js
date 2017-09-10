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
