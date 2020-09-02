'use strict';

var artist;
var track;
var category = 'Music';
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

const clearString = originalTitle => originalTitle
  .replace('VEVO','')
  .replace(/\(?\[?Official\)?\]?/ig,'')
  .replace(/\(?\[?HD\)?\]?/ig,'')
  .replace(/\(?\[?Official Version\)?\]?/ig,'')
  .replace(/\(?\[?Official Audio\)?\]?/ig,'')
  .replace(/\(?\[?Official Video\)?\]?/ig,'')
  .replace(/\(?\[?Official Music Video\)?\]?/ig,'')
  .replace(/\(?\[?Official Music 4K Video\)?\]?/ig,'')
  .replace(/\(?\[?Official 4K Music Video\)?\]?/ig,'')
  .replace(/\(?\[?Official Music Video HD\)?\]?/ig,'')
  .replace(/\(?\[?Official Lyric Video\)?\]?/ig,'')
  .replace(/\(?\[?Official Promo Video\)?\]?/ig,'')
  .replace(/\(?\[?Clipe oficial\)?\]?/ig,'')
  .replace(/\(?\[?videoclipe oficial\)?\]?/ig,'')
  .replace(/\(?\[?Clip Officiel\)?\]?/ig,'')
  .replace(/\(?\[?Music Video\)?\]?/ig,'')
  .replace(/\(?\[?Official MV\)?\]?/ig,'')
  .trim();

function check(info, period) {
  const next = resp => {
    if (resp.track) {
      active = true;
      msg.clickable(true, 'track.scrobble');
      // update title
      // console.log(artist, track);
      msg.title(`Scrobbling Details

Artist: ${artist}
Track: ${track}
Duration: ${duration}
Category: ${category}`);
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
    const parent = document.querySelector('ytd-watch #player-container') ||
      document.querySelector('ytd-player #container');
    editor.form = document.createElement('form');
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
      const parent = document.querySelector('ytd-watch #player-container') ||
        document.querySelector('ytd-player #container');

      if (parent) {
        parent.appendChild(div);
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
    displayFor: (m, time = 4) => {
      div.textContent = m;
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

let timestampsOnDescription = false;
let timestampArray = [];
const handleDescription = description => {
  description.split("\n").map(handleDescriptionLine);
  console.log(timestampArray);
}

const handleDescriptionLine = line => {
  const possibleTimePart = line.split(' ')[0];
  if (isValidTime(possibleTimePart)) {
    timestampsOnDescription = true;
    let lineWithoutTimestamp = line.split(' ').slice(1).join(' ')
    let splitDash = lineWithoutTimestamp.split('-')
    let timestampArtist = clearString(splitDash[0]);
    let timestampTrack = clearString(splitDash[1]);
    timestampArray.push({
      timestamp: parseValidTime(possibleTimePart),
      artist: timestampArtist,
      track: timestampTrack
    });
  }
}

// hh:mm:ss, h:mm:ss, mm:ss or m:ss are accepted
const validTimeRegex = /^(\d?\d\:)?\d?\d\:\d\d$/;
const isValidTime = timeString => validTimeRegex.test(timeString);

const parseValidTime = timeString => {
  let timeParts = timeString.split(':');
  let seconds = timeParts[timeParts.length - 1];
  let minutes = timeParts[timeParts.length - 2];
  let hours = timeParts[timeParts.length - 3] || 0;
  return parseInt(seconds, 10) + 
    (parseInt(minutes, 10) * 60) +
    (parseInt(hours, 10) * 60 * 60);
}

window.addEventListener('message', ({data}) => {
  if (data && data.method === 'lastfm-data-fetched') {
    init();
    const {page, info} = data;
    console.log('data', data);
    handleDescription(page.pageData.playerResponse.videoDetails.shortDescription);
    duration = data.duration;

    try {
      category = page.pageData.response
        .contents.twoColumnWatchNextResults.results
        .results.contents[1].videoSecondaryInfoRenderer
        .metadataRowContainer.metadataRowContainerRenderer
        .rows['0'].metadataRowRenderer.contents['0'].runs['0'].text;
    }
    catch (e) {}
    chrome.storage.local.get({
      categories: ['Música', 'Music', 'Entertainment'],
      checkCategory: true
    }, prefs => {
      if (prefs.categories.indexOf(category) === -1 && prefs.checkCategory) {
        msg.displayFor(`Scrobbling skipped ("${category}" category is not listed)`);
        hideLove();
      }
      else if (duration <= 30) {
        msg.displayFor('Scrobbling skipped (Less than 30 seconds)');
        hideLove();
      } else if (timestampsOnDescription) {
        msg.displayFor('Will scrobble songs from timestamp. Notice it does not support pausing / forward so far.');
      }
      else {
        const song = (({title, author}) => {
          title = title.replace(/^\[[^\]]+\]\s*-*\s*/i, '');
          const separators = [
            ' -- ', '--', ' - ', ' – ', ' — ',
            ' // ', '-', '–', '—', ':', '|', '///', '/'
          ].filter(s => title.indexOf(s) !== -1);
          if (separators.length) {
            let [artist, track] = title.split(separators[0]);
            artist = clearString(artist);
            track = clearString(track);
            return {artist, track};
          }
          else {
            return {
              artist: clearString(author),
              track: clearString(title)
            };
          }
        })(info);
        const filter = track => track
          .replace(/\[.+\]/, '')
          .trim();
        chrome.storage.local.get({
          'filter': true
        }, prefs => {
          track = song.track;
          if (prefs.filter) {
            artist = filter(song.artist);
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
    });
  }
  else if (data && data.method === 'lastfm-player-state') {
    window.clearInterval(timer.id);
    if (data.state === 1 && active) {
      timer.id = window.setInterval(timer.update, 1000);
    }
  }
});
