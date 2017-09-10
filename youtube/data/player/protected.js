'use strict';

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
    var yttools = window.yttools || [];

    yttools.lastfm = {};

    function onYouTubePlayerReady(player) {
      yttools.lastfm.player = player;
      yttools.forEach(c => c(player));

      document.addEventListener('yt-page-data-fetched', e => window.postMessage({
        method: 'lastfm-data-fetched',
        info: player.getVideoData(),
        page: e.data,
        duration: player.getDuration()
      }, '*'));

      player.addEventListener('onStateChange', state => window.postMessage({
        method: 'lastfm-player-state',
        state
      }, '*'));
    }

    {
      function observe(object, property, callback) {
        let value;
        const descriptor = Object.getOwnPropertyDescriptor(object, property);
        Object.defineProperty(object, property, {
          enumerable: true,
          configurable: true,
          get: () => value,
          set: v => {
            callback(v);
            if (descriptor && descriptor.set) {
              descriptor.set(v);
            }
            value = v;
            return value;
          }
        });
      }
      observe(window, 'ytplayer', ytplayer => {
        observe(ytplayer, 'config', config => {
          if (config && config.args) {
            config.args.jsapicallback = 'onYouTubePlayerReady';
          }
        });
      });
    }
  `
}));
