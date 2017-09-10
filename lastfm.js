/* globals md5 */
'use strict';

var lastfm = {
  key: window.atob('M2VjNzY1MGEzZmE5MGY3ZGE3YWE5NmFjMzNmMTIzNjc='),
  secret: window.atob('NzExMzM5YzBjNTQ4ZDJiOWJiMmQ1ZWRmYzg5YzlmY2Q='),
  callback: 'http://tools.add0n.com/oauth.html'
};

lastfm.fetch = obj => {
  obj['api_key'] = lastfm.key;

  if (obj.method !== 'track.getInfo') {
    obj['api_sig'] = md5(Object.keys(obj).sort().map(k => k + obj[k]).join('') + lastfm.secret);
  }
  obj.format = 'json';

  const url = 'https://ws.audioscrobbler.com/2.0/?' +
    Object.entries(obj).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  return fetch(url, {
    method: 'POST'
  }).then(res => res.json());
};

lastfm.authenticate = () => new Promise((resolve, reject) => {
  const observe = (request, sender) => {
    if (request.method === 'auth.getSession') {
      chrome.tabs.remove(sender.tab.id);
      chrome.runtime.onMessage.removeListener(observe);
      lastfm.fetch(request).then(json => {
        if (json && json.error) {
          reject(json.message);
        }
        else if (json && json.session) {
          chrome.storage.local.set({
            session: json.session
          }, resolve);
        }
      }).catch(reject);
    }
  };

  chrome.runtime.onMessage.addListener(observe);
  chrome.tabs.create({
    url: 'https://www.last.fm/api/auth?api_key=' + lastfm.key + '&cb=' + lastfm.callback
  });
});

lastfm.call = request => new Promise((resolve, reject) => {
  chrome.storage.local.get({
    session: null
  }, prefs => {
    if (prefs.session) {
      lastfm.fetch(Object.assign(request, {
        sk: prefs.session.key,
        username: prefs.session.name
      })).then(resolve, reject);
    }
    else {
      lastfm.authenticate()
        .then(() => lastfm.call(request).then(resolve, reject), reject);
    }
  });
});
