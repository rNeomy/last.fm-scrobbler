'use strict';

var token = document.location.search.split('token=').pop().split('&').shift();

chrome.runtime.sendMessage({
  method: 'auth.getSession',
  token
}, () => {
  window.close();
});
