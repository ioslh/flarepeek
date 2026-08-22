// TODO: replace with the real Chrome Web Store listing URL once Flarepeek is published.
const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/REPLACE_WITH_REAL_ID';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-cta="install"]').forEach((el) => {
    el.href = CHROME_WEB_STORE_URL;
  });
});
