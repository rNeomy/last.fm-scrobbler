'use strict';

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
    const isYoutube = window.location.toString().startsWith('https://www.youtube.com');

    const youtubeState = {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      VIDEO_CUED: 5
    };

    var yttools = window.yttools || [];

    yttools.lastfm = {};

    yttools.registerPlayer = player => {
      let fetched = '';

      yttools.lastfm.player = player;

      const onStateChange = state => {

        const {data} = state;
        if(!isYoutube) {
          state = data;
        }

        if(!isYoutube && (state === youtubeState.ENDED || state === youtubeState.UNSTARTED)) {
          fetched = 'true';
        }  

        if (fetched && state === youtubeState.PLAYING) {
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
        if (player.getPlayerState() === youtubeState.PLAYING) {
          onStateChange(youtubeState.PLAYING);
        }
      });

      player.addEventListener('onStateChange', onStateChange);
    };

    function onYouTubePlayerReady(player) {
      yttools.registerPlayer(player);
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

      function registerEmbeddedPlayer() {
        new Promise((resolve, reject) => {
          var isPlayerReady = () => {
            if (typeof window.ytplayer !== 'undefined') {
              if (ytplayer.o.onReady === true) {
                yttools.registerPlayer(ytplayer);
                resolve();
              }
            } else {
              setTimeout(isPlayerReady, 1000);
            }
          };
          setTimeout(isPlayerReady, 1000);
        });
      }
      registerEmbeddedPlayer();
    }
  `
}));
