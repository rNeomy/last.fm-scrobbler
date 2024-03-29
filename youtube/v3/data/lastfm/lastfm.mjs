/* globals md5 */
'use strict';

const lastfm = {
  key: atob('M2VjNzY1MGEzZmE5MGY3ZGE3YWE5NmFjMzNmMTIzNjc='),
  secret: atob('NzExMzM5YzBjNTQ4ZDJiOWJiMmQ1ZWRmYzg5YzlmY2Q=')
};

lastfm.fetch = obj => {
  obj['api_key'] = lastfm.key;

  if (obj.method !== 'track.getInfo') {
    obj['api_sig'] = md5(Object.keys(obj).sort().map(k => k + obj[k]).join('') + lastfm.secret);
  }
  obj.format = 'json';

  const {sk, ...noSk} = obj;
  const sentVars = (obj.method !== 'track.getInfo') ? obj : noSk;

  const url = 'https://ws.audioscrobbler.com/2.0/?' +
    Object.entries(sentVars).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  return fetch(url, {
    method: 'POST'
  }).then(res => {
    if (res.ok) {
      return res.json();
    }
    throw Error('Network Error: ' + res.status);
  });
};

lastfm.authenticate = () => new Promise((resolve, reject) => {
  const ru = chrome.identity.getRedirectURL('oauth.html');
  chrome.identity.launchWebAuthFlow({
    'url': 'https://www.last.fm/api/auth?api_key=' + lastfm.key +
      '&cb=' + encodeURIComponent(ru) +
      // a firefox mess!
      '&redirect_uri=' + encodeURIComponent(ru),
    'interactive': true
  }, url => {
    if (chrome.runtime.lastError || !url) {
      return reject(chrome.runtime.lastError || 'Empty response from chrome.identity.launchWebAuthFlow');
    }
    lastfm.fetch({
      method: 'auth.getSession',
      token: url.split('token=').pop().split('&').shift()
    }).then(json => {
      if (json && json.error) {
        reject(json.message);
      }
      else if (json && json.session) {
        chrome.storage.local.set({
          session: json.session
        }, resolve);
      }
    }).catch(reject);
  });
});

lastfm.call = (request, watch = () => {}) => new Promise((resolve, reject) => {
  chrome.storage.local.get({
    session: null
  }, prefs => {
    if (prefs.session) {
      watch('fetch');
      lastfm.fetch({
        ...request,
        sk: prefs.session.key,
        username: prefs.session.name
      }).then(resolve, reject);
    }
    else {
      watch('authenticate');
      lastfm.authenticate().then(() => {
        lastfm.call(request. watch).then(resolve, reject);
      }, reject);
    }
  });
});

export {
  lastfm
};
