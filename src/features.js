// Build-time switches. Anything unfinished can be gated here and turned on only
// for the experimental branch, which the Pages workflow publishes under /next —
// see .github/workflows/deploy.yml. Read at call time rather than at import, so
// a test can turn one on around the code it is exercising.

// Which build is actually loaded. GitHub Pages caches index.html, so a page can
// keep running an older bundle after a deploy — and "it still doesn't work"
// then means nothing. Shown in the debug readout.
export function buildStamp() {
  return (process.env.REACT_APP_BUILD ?? 'local').slice(0, 7);
}

// ?debug=1 shows what the typing field is receiving. Off everywhere else, and
// nothing about it is persisted.
export function debugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).has('debug');
}
