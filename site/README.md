# FlarePeek marketing site

Static site for flarepeek.com — no build step, no framework. Just `index.html` + `styles.css` +
`config.js`, kept intentionally simple for a single landing page (see the extension's own
[README](../README.md) for why the extension itself doesn't use this approach — different scale of
UI, different call).

## Keeping it honest

Every install CTA points at the real Web Store listing via `config.js` — nothing is a placeholder
any more.

The hero mockup in `index.html` is hand-built CSS, not a screenshot, so it drifts silently whenever
the extension's UI changes. It currently depicts the tab strip, the traffic bar, the version legs
with per-version error rates, and the stats row. **If you change the panel's layout, change the
mockup too** — and check the feature copy while you're there, since claims like "one click" have
gone stale before.

## Preview locally

```sh
pnpm site:dev
```

Runs it the way production will — same asset routing, same 404 handling — rather than a plain file
server, which would happily serve files production excludes.

## Deploy

```sh
pnpm site:deploy
```

An assets-only Worker (`wrangler.jsonc`): no `main`, nothing runs server-side, and requests for
these files aren't Worker invocations. `flarepeek.com` and `www.flarepeek.com` are configured as
custom domains, so Cloudflare manages their DNS records and certificates — both must already exist
as a zone in the same Cloudflare account, or the deploy fails.

`.assetsignore` keeps `wrangler.jsonc` and this README out of the upload. Without it they'd be
fetchable at `flarepeek.com/wrangler.jsonc` and `/README.md`.

The first deploy needs `wrangler login` (or a `CLOUDFLARE_API_TOKEN` in the environment) — note
wrangler v4 warns that the older `CF_API_TOKEN` name is deprecated.
