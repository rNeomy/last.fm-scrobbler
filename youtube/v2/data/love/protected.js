/* globals track, artist */
'use strict';

window.addEventListener('message', ({data}) => {
  if (data && (data.method === 'track.love' || data.method === 'track.unlove')) {
    chrome.runtime.sendMessage(Object.assign(data, {
      track,
      artist
    }), resp => console.log(data.method, resp));
  }
});
