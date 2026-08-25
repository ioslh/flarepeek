// The id-only form; the Web Store redirects it to the canonical
// /detail/<slug>/<id> URL, so this stays correct even if the listing name
// changes later.
const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/ffdbljcgdjkbbbbodnjbbgpahhnkfbnl';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-cta="install"]').forEach((el) => {
    el.href = CHROME_WEB_STORE_URL;
  });
});
