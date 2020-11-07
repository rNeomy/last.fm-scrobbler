'use strict';

let artist;
let track;
let category = 'Music';
let duration;
let start;
let active = false;
const timer = {
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
    msg.display('Scrobbling in ' + timer.get());
  }
};

// Dua Lipa, Angèle - Fever (Official Music Video)
// Katy Perry - Roar (Official)
// [OFFICIAL VIDEO] Amazing Grace - Pentatonix
// BEST MUSIC 2019 (HD sound quality)
// Autechre - SIGN (Full Album)

const clearString = originalTitle => originalTitle
  .replace(/^- /, '')
  .replace('VEVO', '')
  .replace(/(?<=\()[^)]*(video|videoclipe|clipe|audio|official|oficial|hd|version|music|4k|lyric|promo|album)[^)]*(?=\))/ig, '')
  .replace(/\(\)/g, '')
  .replace(/(?<=\[)[^\]]*(video|videoclipe|clipe|audio|official|oficial|hd|version|music|4k|lyric|promo|album)[^\]]*(?=\])/ig, '')
  .replace(/\[\]/g, '')
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
Category: ${category}

--
Use Shift + Click to Edit
Use Ctrl + Click or Command + Click to Abort Submission`);
      // install the love button
      document.documentElement.appendChild(Object.assign(document.createElement('script'), {
        src: chrome.runtime.getURL('/data/love/unprotected.js?loved=' + resp.track.userloved)
      }));
      // install track observer
      chrome.storage.local.get({
        minTime: 240
      }, prefs => {
        timer.duration = period || Math.min(Math.round(duration) - 10, prefs.minTime);
        clearInterval(timer.id);
        timer.id = window.setInterval(timer.update, 1000);
      });
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

const editor = {
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
        type: 'button',
        value: 'Discard',
        onclick() {
          editor.remove();
        }
      }));
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

const msg = (div => {
  div.onclick = e => {
    let action = div.dataset.action;
    if (e.shiftKey && action === 'track.scrobble') {
      action = 'edit';
    }
    if (action === 'track.scrobble') {
      window.clearInterval(timer.id);
      if (e.ctrlKey || e.metaKey) {
        active = false;
        return msg.displayFor('Submission aborted', 0.75);
      }


      div.textContent = 'Scrobbling ...';
      // console.log('track.scrobble', 'track', track, 'artist', artist)
      // console.log('timestamp', Math.max(start.getTime(), (new Date()).getTime() - 4 * 60 * 1000) / 1000);
      chrome.runtime.sendMessage({
        method: 'track.scrobble',
        track,
        artist,
        // timestamp: Math.max(start.getTime(), (new Date()).getTime() - minTime * 1000) / 1000
        timestamp: start.getTime() / 1000
      }, resp => {
        // console.log('track.scrobble', resp);
        active = false;
        msg.clickable(false);
        msg.displayFor(resp && resp.scrobbles ? 'Submitted' : 'Failed', 0.75);
      });
    }
    else if (action === 'edit') {
      window.clearInterval(timer.id);
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

window.addEventListener('message', ({data}) => {
  if (data && data.method === 'lastfm-data-fetched') {
    init();
    const {page, info} = data;
    duration = data.duration;

    try {
      category = page.pageData.playerResponse.microformat.playerMicroformatRenderer.category;
    }
    catch (e) {}
    try {
      category = category || page.pageData.response
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
      }
      else {
        const chapter = document.querySelector('.ytp-chapter-title-content');
        const chapterCache = [];
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
            // use chapter title when possible
            if (chapter && chapter.textContent) {
              track = clearString(chapter.textContent);
              chapterCache.push(track);
            }
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
          if (artist && track) {
            check();
            // observe chapter changes
            if (chapter) {
              const observer = new MutationObserver(() => {
                const newTrack = clearString(chapter.textContent);
                // analyze only once
                if (newTrack && chapterCache.indexOf(newTrack) === -1) {
                  track = newTrack;
                  chapterCache.push(newTrack);
                  // clear old submission
                  msg.clickable(false);
                  msg.display('Analyzing...');
                  check();
                }
              });
              observer.observe(chapter, {
                characterData: true,
                attributes: true, childList: true, subtree: true
              });
            }
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
      clearInterval(timer.id);
      timer.id = window.setInterval(timer.update, 1000);
    }
  }
});


