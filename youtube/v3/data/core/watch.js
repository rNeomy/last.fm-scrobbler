// Chapter -> https://www.youtube.com/watch?v=O9Dcs9U7rXM
// Wrong Category -> https://www.youtube.com/watch?v=eeSumnHQKvo

// monitor pause and resume
const state = player => {
  player.removeEventListener('onStateChange', state.watch);
  player.addEventListener('onStateChange', state.watch);
};
state.watch = state => {
  const iframe = document.getElementById('last-fm-core');
  iframe.contentWindow.postMessage({
    method: 'state',
    state
  }, '*');
};

const chapter = c => {
  const e = document.querySelector('.ytp-chapter-title-content');
  if (e) {
    const cache = new Set();

    try {
      chapter.observer.disconnect();
      console.log(111);
    }
    catch (e) {}

    const observer = chapter.observer = new MutationObserver(() => {
      const newTrack = e.textContent;

      if (newTrack && cache.has(newTrack) === false) {
        cache.add(newTrack);

        c(newTrack);
      }
    });
    observer.observe(e, {
      characterData: true,
      attributes: true, childList: true, subtree: true
    });
  }
};

// when moving from the homepage to a video page, there are multiple players in the page
const get = () => {
  return [...document.querySelectorAll('.html5-video-player')].sort((a, b) => {
    return b.offsetHeight - a.offsetHeight;
  }).shift();
};

{
  const iframe = document.getElementById('last-fm-core');
  let timeout;

  const watch = (title = '', count = 0) => {
    if (location.hostname !== 'music.youtube.com' && location.pathname.startsWith('/watch') === false) {
      return;
    }

    if (iframe) {
      const player = get();
      if (player) {
        const data = player.getVideoData();

        // in case video data is not ready wait for 0.5s
        if (data.author === '' && count < 10) {
          console.info('Retrying to get video info', count);
          count += 1;
          setTimeout(watch, 500, title, count);
        }
        else {
          // detect state changes
          state(player, iframe);
          // detect chapter changes
          chapter(title => {
            watch(title);
          });

          // prevent multiple requests
          clearTimeout(timeout);
          timeout = setTimeout(() => iframe.contentWindow.postMessage({
            method: 'play',
            response: player.getPlayerResponse(),
            data,
            duration: player.getDuration(),
            state: player.getPlayerState(),
            title,
            category: location.hostname === 'music.youtube.com' ? 'Music' : ''
          }, '*'), 300);
        }
      }
      else {
        console.warn('Cannot detect YouTube player');
      }
    }
  };
  watch();

  // on YouTube Music, "yt-navigate-finish" event is not fired on new tracks
  if (location.hostname === 'music.youtube.com') {
    window.addEventListener('play', () => {
      const player = get();
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
}
