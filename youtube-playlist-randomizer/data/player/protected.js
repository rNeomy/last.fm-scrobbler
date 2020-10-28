'use strict';

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
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
        state = data;

        if(state === youtubeState.ENDED || state === youtubeState.UNSTARTED) {
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

      player.addEventListener('onStateChange', onStateChange);
    };

    function onYouTubePlayerReady(player) {
      yttools.registerPlayer(player);
    }

    {
      function registerEmbeddedPlayer() {
        new Promise((resolve, reject) => {
          var isPlayerReady = () => {
            if (typeof window.ytplayer !== 'undefined') {
              if (ytplayer.w.onReady === true) {
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
