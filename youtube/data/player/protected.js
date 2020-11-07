'use strict';

{
  const script = document.createElement('script');
  script.textContent = `
    var yttools = window.yttools || [];

    yttools.lastfm = {};

    yttools.push(player => {
      let fetched = '';

      yttools.lastfm.player = player;

      const onStateChange = state => {
        console.log('FM', state);
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
        console.log(e.detail);
        fetched = e.detail;
        if (player.getPlayerState() === 1) {
          onStateChange(1);
        }
      });
      if (player.getPlayerState() === 1) {
        onStateChange(1);
      }

      player.addEventListener('onStateChange', onStateChange);
    });

    function onYouTubePlayerReady(player) {
      if (yttools.resolved !== true) {
        yttools.resolved = true;
        for (const c of yttools) {
          try {
            c(player);
          }
          catch (e) {}
        }
      }
    }
    window.addEventListener('spfready', () => {
      if (typeof window.ytplayer === 'object' && window.ytplayer.config && yttools.resolved !== true) {
        window.ytplayer.config.args.jsapicallback = 'onYouTubePlayerReady';
      }
    });
    window.addEventListener('yt-navigate-finish', () => {
      const player = document.querySelector('.html5-video-player');
      if (player && yttools.resolved !== true) {
        yttools.resolved = true;
        for (const c of yttools) {
          try {
            c(player);
          }
          catch (e) {}
        }
      }
    });
  `;
  document.documentElement.appendChild(script);
  script.remove();
}
