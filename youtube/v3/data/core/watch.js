// Chapter -> https://www.youtube.com/watch?v=O9Dcs9U7rXM
// Wrong Category -> https://www.youtube.com/watch?v=eeSumnHQKvo

{
  const iframe = document.getElementById('last-fm-core');
  const player = document.querySelector('.html5-video-player');

  const watch = (title = '') => {
    if (location.hostname !== 'music.youtube.com' && location.pathname.startsWith('/watch') === false) {
      return;
    }

    if (iframe && player) {
      iframe.contentWindow.postMessage({
        method: 'play',
        response: player.getPlayerResponse(),
        data: player.getVideoData(),
        duration: player.getDuration(),
        state: player.getPlayerState(),
        title
      }, '*');
    }
  };
  watch();

  // on YouTube Music, "yt-navigate-finish" event is not fired on new tracks
  if (location.hostname === 'music.youtube.com') {
    window.addEventListener('play', () => {
      if (player) {
        const time = player.getCurrentTime();
        if (time === 0) {
          watch();
        }
      }
    }, true);
  }
  else {
    window.addEventListener('yt-navigate-finish', () => {
      watch();
    });
  }

  const chapter = document.querySelector('.ytp-chapter-title-content');
  if (chapter) {
    const cache = new Set();
    const observer = new MutationObserver(() => {
      const newTrack = chapter.textContent;

      if (newTrack && cache.has(newTrack) === false) {
        cache.add(newTrack);

        watch(newTrack);
      }
    });
    observer.observe(chapter, {
      characterData: true,
      attributes: true, childList: true, subtree: true
    });
  }

  // monitor pause and resume
  if (player) {
    player.addEventListener('onStateChange', state => {
      if (iframe) {
        iframe.contentWindow.postMessage({
          method: 'state',
          state
        }, '*');
      }
    });
  }
}

