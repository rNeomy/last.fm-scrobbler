'use strict';
{
  const NSPACE = 'http://www.w3.org/2000/svg';

  const settings = document.querySelector('.ytp-settings-button');
  if (settings) {
    const button = document.querySelector('.ytp-love-button');
    if (button) {
      const loved = document.currentScript.src.indexOf('loved=1') !== -1;

      console.log(loved);
      button.dataset.love = !loved;
      button.dataset.hidden = false;
      button.querySelector('path').classList[loved ? 'remove' : 'add']('ytp-svg-fill');
    }
    else {
      const path = document.createElementNS(NSPACE, 'path');
      path.setAttribute('fill', '#df2703');
      path.setAttribute('d', 'M23.99291,15.87187l1.0159-0.8889c1.3968-1.2275,3.118-1.8341,4.8535-1.8341 ' +
             'c2.0316,0,4.0351,0.8324,5.4883,2.4549c2.5961,2.9347,2.4127,7.3508-0.3386,10.0597l-9.8284,8.7357 ' +
             'c-0.6794,0.6026-1.7019,0.6026-2.3814,0l-9.8143-8.7357c-2.7512-2.6948-2.9346-7.125-0.3386-10.0597 ' +
             'c1.4532-1.6225,3.4567-2.4549,5.4884-2.4549c1.7213,0,3.4567,0.6066,4.8535,1.8341L23.99291,15.87187');

      const svg = document.createElementNS(NSPACE, 'svg');
      svg.setAttribute('height', '100%');
      svg.setAttribute('width', '100%');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 48 48');

      const love = Object.assign(settings.cloneNode(true), {
        textContent: '',
        title: 'Love or Unlove this track in Last.fm',
        onclick: () => {
          const value = love.dataset.love === 'true';
          window.postMessage({
            method: value ? 'track.love' : 'track.unlove'
          }, '*');
          love.dataset.love = !value;
          path.classList[value ? 'remove' : 'add']('ytp-svg-fill');
        }
      });
      love.classList.add('ytp-love-button');
      love.classList.remove('ytp-settings-button');

      if (document.currentScript.src.indexOf('loved=1') === -1) {
        love.dataset.love = true;
        path.classList.add('ytp-svg-fill');
      }
      else {
        love.dataset.love = false;
      }

      love.appendChild(svg);
      svg.appendChild(path);
      settings.parentNode.insertBefore(love, settings);
    }
  }
  else {
    console.log('cannot attach love');
  }
  window.addEventListener('message', ({data}) => {
    if (data && data.method === 'lastfm-hide-love') {
      const button = document.querySelector('.ytp-love-button');
      if (button) {
        button.dataset.hidden = true;
      }
    }
  });
}
