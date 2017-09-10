'use strict';

if (window.location.host === 'docs.oracle.com') {
  if (/\/javase\/[67]/.test(window.location.pathname)) {
    const pathname = window.location.pathname.replace(/\/javase\/[67]/, '/javase/8');
    window.location.replace(pathname);
  }
}
