'use strict';

const youtubeState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  VIDEO_CUED: 5
};

var artist;
var track;
var duration;
var start;
var msg;
var active = false;
var timer = {
  id: -1,
  duration: 30,
  get: () => {
    const duration = timer.duration;
    return ('0' + Math.floor(duration / 60)).substr(-2) + ':' + ('0' + duration % 60).substr(-2);
  },
  update: () => {
    timer.duration -= 1;
    if (timer.duration === 0) {
      msg.click();
    }
    msg.display('Scrobbling in ' + timer.get() + ' seconds');
  }
};

function check(info, period) {
  // Check if this track is indexed or not
  const next = resp => {
    if (resp.track) {
      active = true;
      msg.clickable(true, 'track.scrobble');
      // update title
      // console.log(artist, track);
      msg.title(`Scrobbling Details

Artist: ${artist}
Track: ${track}
Duration: ${duration}`);
      // install the love button
      document.documentElement.appendChild(Object.assign(document.createElement('script'), {
        src: chrome.runtime.getURL('/data/love/unprotected.js?loved=' + resp.track.userloved)
      }));
      // install track observer
      timer.duration = period || Math.min(Math.round(duration) - 10, 4 * 60);
      timer.id = window.setInterval(timer.update, 1000);
    }
    else {
      msg.clickable(true, 'edit');
      msg.displayFor(`Scrobbling skipped (${resp.message}). Click to edit`, 20);
      hideLove();
    }
  };
  if (info) {
    next(info);
  }
  else {
    // Check if this track is indexed or not
    chrome.runtime.sendMessage({
      method: 'track.getInfo',
      artist,
      track,
      duration
    }, next);
  }
}

var editor = {
  form: null,
  init: () => {
    const parent = document.querySelector('#videotitle');
    editor.form = document.createElement('form');

    editor.form.addEventListener('keydown', event => {
      event.stopPropagation(); // disable hotkeys while filling details
      });
    
    if (parent) {
      const aInput = Object.assign(document.createElement('input'), {
        'type': 'text',
        'value': artist
      });
      const tInput = Object.assign(document.createElement('input'), {
        'type': 'text',
        'value': track
      });
      editor.form.appendChild(document.createTextNode('Artist: '));
      editor.form.appendChild(aInput);
      editor.form.appendChild(document.createTextNode(' Track: '));
      editor.form.appendChild(tInput);
      editor.form.appendChild(Object.assign(document.createElement('input'), {
        type: 'submit',
        value: 'Submit'
      }));
      editor.form.classList.add('scrobbler-editor');
      editor.form.addEventListener('submit', e => {
        e.preventDefault();
        track = tInput.value;
        artist = aInput.value;
        editor.remove();
        chrome.storage.local.get({
          manualCheck: false
        }, prefs => prefs.manualCheck ? check() : check({
          track: {
            userloved: false
          }
        }, 30));
      });
      parent.appendChild(editor.form);
      aInput.focus();
    }
    else {
      console.error('Cannot install editor', 'parent not found');
    }
  },
  remove: () => {
    if (editor.form) {
      editor.form.remove();
      editor.form = null;
    }
  }
};

msg = (div => {
  div.onclick = () => {
    const action = div.dataset.action;
    if (action === 'track.scrobble') {
      window.clearInterval(timer.id);

      div.textContent = 'Scrobbling ...';
      chrome.runtime.sendMessage({
        method: 'track.scrobble',
        track,
        artist,
        timestamp: Math.max(start.getTime(), (new Date()).getTime() - 4 * 60 * 1000) / 1000
      }, resp => {
        // console.log('track.scrobble', resp);
        active = false;
        msg.clickable(false);
        msg.displayFor(resp && resp.scrobbles ? 'Submitted' : 'Failed', 0.75);
      });
    }
    else if (action === 'edit') {
      msg.clear();
      editor.init();
    }
  };

  return {
    init: () => {
      div.classList.add('scrobbler-div');
      const parent = document.querySelector('.videowrapper');

      if (parent) {
        parent.insertAdjacentElement('afterend', div);
      } 
      else {
        console.error('Cannot install msgbox', 'parent not found');
      }
      msg.init = () => {};
    },
    display: msg => div.textContent = msg,
    clear: () => {
      div.textContent = '';
      window.clearTimeout(msg.id);
    },
    displayFor: (msg, time = 4) => {
      div.textContent = msg;
      window.clearTimeout(msg.id);
      msg.id = window.setTimeout(() => div.textContent = '', time * 1000);
    },
    title: msg => div.title = msg,
    click: () => div.click(),
    clickable: (bol, action = '') => {
      div.dataset.clickable = bol;
      div.dataset.action = action;
    }
  };
})(document.createElement('div'));

function init() {
  editor.remove();
  msg.init();
  msg.clickable(false);
  msg.display('Analyzing...');

  active = false;

  start = new Date();

  window.clearInterval(timer.id);
}
function hideLove() {
  window.postMessage({
    method: 'lastfm-hide-love'
  }, '*');
}

var registerToMessages = () => {
  window.addEventListener('message', ({data}) => {
    if (data && data.method) {
      switch (data.method) {
        case 'lastfm-data-fetched':
          init();
          const {
            info
          } = data;
          duration = data.duration;

          if (duration <= 30) {
            msg.displayFor('Scrobbling skipped (Less than 30 seconds)');
            hideLove();
          }
          else {
            const song = (({title, author}) => {
              title = title.replace(/^\[[^\]]+\]\s*-*\s*/i, '');
              const separators = [
                ' -- ', '--', ' - ', ' – ', ' — ',
                ' // ', '-', '–', '—', ':', '|', '///', '/'
              ].filter(s => title.indexOf(s) !== -1);
              if (separators.length) {
                const [artist, track] = title.split(separators[0]);
                return {artist, track};
              }
              else {
                return {
                  artist: author.replace('VEVO', ''),
                  track: title
                };
              }
            })(info);
            const filter = track => track
            .replace(/\[.+\]|\(.+\)/, '')
            .trim();
            chrome.storage.local.get({
              'filter': true
            }, prefs => {
              if (prefs.filter) {
                artist = filter(song.artist);
                track = filter(song.track);
              }
              else {
                artist = song.artist;
              }
              // console.log(artist, track);
              if (artist && track) {
                check();
              }
              else {
                msg.clickable(true, 'edit');
                msg.displayFor('Scrobbling skipped (Unknown artist/track); Click to edit.', 20);
                hideLove();
              }
            });
          }
          break;
        case 'lastfm-player-state':
          window.clearInterval(timer.id);
          if (data.state === youtubeState.PLAYING && active) {
            timer.id = window.setInterval(timer.update, 1000);
          }
          break;
        case 'track.love': 
        case 'track.unlove':
          break;
        default:
          console.log('unknown method ' + data.method);
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', registerToMessages);
