import {toast, tools} from './helper.mjs';
import {lastfm} from '../lastfm/lastfm.mjs';

// find artist and track name
self.parse = (data, suggestedTitle) => new Promise(resolve => {
  let {title, author} = data;
  title = suggestedTitle || title;
  title = tools.clean(title, 'title');

  let artist = author;
  let track = title;

  const separators = tools.separators.filter(s => title.includes(s));
  if (separators.length) {
    [artist, track] = title.split(separators[0]);
  }

  artist = tools.clean(artist, 'artist');
  track = tools.clean(track, 'track');

  resolve({artist, track});
});

const error = e => {
  document.body.dataset.mode = 'error';
  const n = document.getElementById('submit');
  n.disabled = true;
  n.value = 'Error';
  console.error(e);
  toast(e.message, -1);
};

const timer = {
  id: -1,
  duration: 30,
  mode: 'active', // disabled, active, paused
  get: () => {
    const duration = timer.duration;
    return ('0' + Math.floor(duration / 60)).substr(-2) + ':' + ('0' + duration % 60).substr(-2);
  },
  update: () => {
    timer.duration -= 1;
    if (timer.duration === 0) {
      timer.stop();
      document.getElementById('submit').click();
    }
    else {
      document.getElementById('submit').value = `Submit (${timer.get()})`;
    }
  },
  stop(value = 'Submit') {
    clearInterval(timer.id);
    timer.mode = 'disabled';
    document.getElementById('submit').value = value;
  },
  set(duration) {
    chrome.storage.local.get({
      minTime: 30
    }, prefs => {
      timer.now = Date.now();
      timer.duration = Math.min(Math.round(duration) - 10, prefs.minTime);
      timer.stop();
      timer.mode = 'active';
      if (timer.mode === 'active') {
        clearInterval(timer.id);
        timer.id = setInterval(timer.update, 1000);
      }
    });
  },
  pause() {
    if (timer.mode === 'paused' || timer.mode === 'active') {
      clearInterval(timer.id);
      document.getElementById('submit').value = 'Submit (paused)';
      timer.state = 'paused';
    }
  },
  resume() {
    if (timer.mode === 'paused' || timer.mode === 'active') {
      clearInterval(timer.id);
      timer.id = setInterval(timer.update, 1000);
      timer.update();
    }
  }
};

const play = request => {
  document.body.dataset.mode = 'parsing';
  toast('parsing...', -1);

  const {data, response, duration, title, state} = request;
  let {category} = request;

  timer.mode = state === 1 ? 'active' : 'disabled';

  category = category ||
    response?.microformat?.playerMicroformatRenderer?.category ||
    response?.microformat?.microformatDataRenderer?.category ||
    'NA';

  const channel = (data.author || '').replace(/vevo/i, '');

  console.info('Channel:', channel, 'Category:', category);

  chrome.storage.local.get({
    categories: ['Música', 'Music', 'Entertainment'],
    pretendToBeMusic: ['full album'],
    blacklistAuthors: [],
    checkCategory: true
  }, async prefs => {
    chrome.runtime.sendMessage({
      method: 'show'
    }, () => chrome.runtime.lastError);

    const hide = () => chrome.runtime.sendMessage({
      method: 'hide'
    }, () => chrome.runtime.lastError);

    // https://github.com/rNeomy/last.fm-scrobbler/issues/29
    if (prefs.pretendToBeMusic.length && prefs.categories.includes(category) === false) {
      const t = data.title.toLowerCase();
      for (const word of prefs.pretendToBeMusic) {
        if (t.includes(word)) {
          category = 'Music';
          break;
        }
      }
    }

    if (prefs.categories.indexOf(category) === -1 && prefs.checkCategory) {
      toast(`Scrobbling skipped ("${category}" category is not listed)`, undefined, hide);
    }
    else if (duration <= 30) {
      toast('Scrobbling skipped (Less than 30 seconds)', undefined, hide);
    }
    else if (prefs.blacklistAuthors.map(s => s.toLowerCase()).indexOf(channel.toLowerCase()) !== -1) {
      toast(`Scrobbling skipped ("${channel}" is in the blacklist)`, undefined, hide);
    }
    else {
      const o = await self.parse(data, title);
      let {artist} = o;
      const {track} = o;

      chrome.storage.local.get({
        'filter': true
      }, prefs => {
        if (prefs.filter) {
          artist = tools.filter(artist);
        }

        document.body.dataset.mode = 'submit';
        document.getElementById('artist').value = artist || '';
        document.getElementById('track').value = track || '';

        document.getElementById('duration').value = duration;
        toast('Validating...', -1);

        if (artist && track) {
          lastfm.call({
            method: 'track.getInfo',
            artist,
            track,
            duration
          }, state => {
            const e = document.getElementById('submit');
            if (state === 'authenticate') {
              e.value = 'Authenticating';
              e.disabled = true;
            }
            else {
              e.value = 'Submit';
              e.disabled = false;
            }
          }).then(r => {
            if (r.track) {
              // report to last.fm
              lastfm.call({
                method: 'track.updateNowPlaying',
                artist,
                track
              });
              // start counter
              toast('');
              timer.set(duration);
            }
            else {
              timer.stop();
              toast(r?.message || 'Not Found!');
              console.warn('Response', r);
            }
          }).catch(error);
        }
        else {
          document.body.dataset.mode = 'edit';
          toast('Scrobbling skipped (Unknown artist or track)', 20, hide);
        }
      });
    }
  });
};

// this is called when a new track is played
window.addEventListener('message', e => {
  if (e.data.method === 'play') {
    play(e.data);
  }
  else if (e.data.method === 'state') {
    timer[e.data.state === 1 ? 'resume' : 'pause']();
  }
});

document.querySelector('form').addEventListener('submit', e => {
  e.preventDefault();
  timer.stop('Wait...');
  document.body.dataset.mode = 'perform';

  const track = document.getElementById('track').value;
  const artist = document.getElementById('artist').value;

  lastfm.call({
    method: 'track.scrobble',
    track,
    artist,
    timestamp: (timer.now || performance.timeOrigin) / 1000
  }).then(() => document.getElementById('close').click()).catch(error);
});

document.getElementById('close').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    method: 'hide'
  }, () => chrome.runtime.lastError);
  timer.stop();
});

// stop counting on edit
document.getElementById('artist').addEventListener('input', () => timer.stop());
document.getElementById('track').addEventListener('input', () => timer.stop());
