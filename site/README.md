# Flarepeek marketing site

Static site for flarepeek.com — no build step, no framework. Just `index.html` + `styles.css` +
`config.js`, kept intentionally simple for a single landing page (see the extension's own
[README](../README.md) for why the extension itself doesn't use this approach — different scale of
UI, different call).

## Before shipping

`config.js` has a placeholder Chrome Web Store URL:

```js
const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/REPLACE_WITH_REAL_ID';
```

Swap that for the real listing URL once Flarepeek is published — it's the only thing wired to a
placeholder.

## Preview locally

Any static file server works, e.g.:

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Static files, no build — works on Cloudflare Pages, GitHub Pages, Netlify, etc. For Cloudflare
Pages: set the project root to `site/`, no build command, output directory `site/`.
