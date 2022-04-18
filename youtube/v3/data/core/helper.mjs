const toast = (msg, duration = 10, c = () => {}) => {
  const e = document.getElementById('toast');
  e.textContent = msg;
  clearTimeout(toast.id);
  if (duration > 0) {
    toast.id = setTimeout(() => {
      e.textContent = '';
      c();
    }, duration * 1000);
  }
};

const tools = {
  separators: [
    ' -- ', '--', ' - ', ' – ', ' — ',
    ' // ', '-', '–', '—', ':', '|', '///', '/'
  ],
  clean(originalTitle, type) {
    if (type === 'title') {
      return originalTitle.replace(/^\[[^\]]+\]\s*-*\s*/i, '');
    }

    originalTitle = originalTitle
      .replace(' - Topic', '')
      .replace(/^- /, '')
      .replace('VEVO', '')
      .replace(/(?<=\()[^)]*(video|videoclipe|clipe|audio|official|oficial|hd|version|music|4k|lyric|promo|album)[^)]*(?=\))/ig, '')
      .replace(/\(\)/g, '')
      .replace(/(?<=\[)[^\]]*(video|videoclipe|clipe|audio|official|oficial|hd|version|music|4k|lyric|promo|album)[^\]]*(?=\])/ig, '')
      .replace(/\[\]/g, '');

    // e.g. 1. Dance, Baby!
    // e.g. 00:00 01. Bad Company - Riptide
    originalTitle = originalTitle.replace(/^\d[ \d.:-]+/, '');
    if (type === 'artist') {
      // e.g. Prince: The Story of 'Sign O’ The Times’ Ep. 1
      originalTitle = originalTitle.split(':')[0];
    }
    return originalTitle.trim();
  },
  filter(track) {
    return track.replace(/\[.+\]/, '').trim();
  }
};

export {
  toast,
  tools
};
