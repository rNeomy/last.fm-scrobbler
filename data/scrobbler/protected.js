'use strict';

var artist;
var track;
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

msg = (div => {
  div.onclick = () => {
    window.clearInterval(timer.id);

    div.textContent = 'Scrobbling ...';
    chrome.runtime.sendMessage({
      method: 'track.scrobble',
      track,
      artist,
      timestamp: Math.max(start.getTime(), (new Date()).getTime() - 4 * 60 * 1000) / 1000
    }, resp => {
      console.log('track.scrobble', resp);
      active = false;
      msg.clickable(false);
      msg.displayFor(resp && resp.scrobbles ? 'Submitted' : 'Failed', 0.75);
    });
  };

  let id;
  return {
    init: () => {
      div.classList.add('scrobbler-div');
      const parent = document.querySelector('ytd-watch #player-container');

      if (parent) {
        parent.appendChild(div);
      }
      else {
        console.log('Cannot install msgbox', 'parent not found');
      }
      msg.init = () => {};
    },
    display: msg => div.textContent = msg,
    displayFor: (msg, time = 2) => {
      div.textContent = msg;
      window.clearTimeout(id);
      id = window.setTimeout(() => div.textContent = '', time * 1000);
    },
    title: msg => div.title = msg,
    click: () => div.click(),
    clickable: bol => div.dataset.clickable = bol
  };
})(document.createElement('div'));

function init() {
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
    const {page, duration, info} = data;

    let category = 'Music';
    try {
      category = page.pageData.response
        .contents.twoColumnWatchNextResults.results
        .results.contents[1].videoSecondaryInfoRenderer
        .metadataRowContainer.metadataRowContainerRenderer
        .rows['0'].metadataRowRenderer.contents['0'].runs['0'].text;
    }
    catch (e) {}

    if (['Música', 'Music', 'Entertainment'].indexOf(category) === -1) {
      msg.displayFor('Scrobbling skipped (Category not supported)');
      hideLove();
    }
    else if (duration <= 30) {
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
      artist = song.artist;
      track = song.track;
      if (artist && track) {
        // Check if this track is indexed or not
        chrome.runtime.sendMessage({
          method: 'track.getInfo',
          artist,
          track,
          duration
        }, resp => {
          if (resp.track) {
            active = true;
            msg.clickable(true);
            // update title
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
            timer.duration = Math.min(Math.round(duration) - 10, 4 * 60);
            timer.id = window.setInterval(timer.update, 1000);
          }
          else {
            msg.displayFor(`Scrobbling skipped (${resp.message})`);
            hideLove();
          }
        });
      }
      else {
        msg.displayFor('Scrobbling skipped (Unknown artist/track)');
        hideLove();
      }
    }
  }
  else if (data && data.method === 'lastfm-player-state') {
    window.clearInterval(timer.id);
    if (data.state === 1 && active) {
      timer.id = window.setInterval(timer.update, 1000);
    }
  }
});
