'use strict';

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
    var yttools = window.yttools || [];

    yttools.lastfm = {};

    yttools.push(player => {
      let fetched = '';

      yttools.lastfm.player = player;

      const onStateChange = state => {
        if (fetched && state === 1) {
          window.postMessage({
            method: 'lastfm-data-fetched',
            info: player.getVideoData(),
            page: fetched,
            duration: player.getDuration()
          }, '*');
          fetched = '';
        }
        window.postMessage({
          method: 'lastfm-player-state',
          state
        }, '*');
      };

      document.addEventListener('yt-page-data-fetched', e => {
        fetched = e.detail;
        if (player.getPlayerState() === 1) {
          onStateChange(1);
        }
      });

      player.addEventListener('onStateChange', onStateChange);
    });

    function onYouTubePlayerReady(player) {
      yttools.forEach(c => c(player));
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
