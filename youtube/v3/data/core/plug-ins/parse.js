// https://github.com/rNeomy/last.fm-scrobbler/issues/27

{
  const cache = {};

  document.querySelector('form').addEventListener('submit', () => {
    const track = document.getElementById('track').value;
    const artist = document.getElementById('artist').value;

    const oTrack = document.getElementById('track').dataset.value;
    const oArtist = document.getElementById('artist').dataset.value;

    // save user-edited tracks
    if (track !== oTrack || artist !== oArtist) {
      console.info('Save custom parsing...');
      chrome.storage.local.get({
        renames: {}
      }, prefs => chrome.storage.local.set({
        renames: {
          ...prefs.renames,
          [oArtist + '|' + oTrack]: {artist, track}
        }
      }));
    }
  });

  self.parse = new Proxy(self.parse, {
    apply(target, self, args) {
      return Reflect.apply(target, self, args).then(({artist, track}) => {
        return new Promise(resolve => chrome.storage.local.get({
          renames: {}
        }, prefs => {
          const key = artist + '|' + track;
          cache[key] = prefs;

          document.getElementById('track').dataset.value = track;
          document.getElementById('artist').dataset.value = artist;
          if (prefs.renames[key]) {
            resolve(prefs.renames[key]);
          }
          else {
            resolve({artist, track});
          }
        }));
      });
    }
  });
}
