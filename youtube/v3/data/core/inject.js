const add = (count = 0) => setTimeout(() => {
  const player = document.querySelector('.html5-video-player');
  const node = document.querySelector('#info-contents, .song-media-controls');

  // already injected
  if (document.getElementById('last-fm-core')) {
    return;
  }

  if (player && node) {
    const e = document.getElementById('last-fm-core');
    if (!e) {
      const iframe = document.createElement('iframe');
      iframe.id = 'last-fm-core';
      iframe.src = chrome.runtime.getURL('/data/core/index.html');
      iframe.classList.add('hidden');

      iframe.addEventListener('load', () => {
        chrome.runtime.sendMessage({
          method: 'inject',
          file: '/data/core/watch.js'
        }, () => chrome.runtime.lastError);
      }, {
        once: true
      });
      node.after(iframe);
    }
  }
  else if (count < 5) {
    add(count + 1);
  }
  else {
    console.warn('Cannot inject last-fm-core', player, node);
  }
}, 100);

window.addEventListener('yt-navigate-finish', add);
window.addEventListener('play', () => add(), true);
