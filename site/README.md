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

## The site demos the extension on itself

The hero shows which version of this Worker is serving you. That one number is why `index.ts`
exists: static assets can't be templated per request, so the site runs as a Worker with a
`version_metadata` binding and rewrites a placeholder with `HTMLRewriter`.

Two consequences worth knowing before editing `wrangler.jsonc`:

- **`run_worker_first` is a path list, not `true`.** Default asset routing serves a matching file
  without invoking the Worker, which would leave the version id showing `unknown`. Only `/` and
  `/privacy` run the Worker; CSS and images still cost no invocation. **Add any new HTML page to
  that list** or its version readout will silently stay a placeholder.
- **Version overrides only work for versions in the current deployment**
  ([docs](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)),
  and a deployment holds at most two versions. So the demo state is: live version at 100%, one demo
  version staged at 0%. A version that was only `versions upload`ed cannot be previewed — the
  override header is silently ignored and you get the live version back. Verify with:

```sh
curl -s -H 'Cloudflare-Workers-Version-Overrides: flarepeek-site="<version-id>"' \
  https://flarepeek.com/ | grep -o 'data-fp-version title="[^"]*"'
```

**`pnpm site:deploy` wipes the staged version.** A plain deploy replaces the whole deployment with
the new version at 100%, so the 0% demo version is dropped and version overrides stop working until
you stage one again. Every content change to this site therefore needs two commands, not one.

Re-stage a different version for the demo with:

```sh
pnpm exec wrangler versions deploy --config site/wrangler.jsonc <live-id>@100 <demo-id>@0 --yes
```

Because every version here is byte-identical, the version id in the hero is the _only_ way to tell
them apart — which is exactly what makes it a demo. Give each one a `--tag`; it renders as a pill
next to the id.

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

`flarepeek.com` and `www.flarepeek.com` are configured as custom domains, so Cloudflare manages
their DNS records and certificates — both must already exist as a zone in the same Cloudflare
account, or the deploy fails.

`.assetsignore` keeps `wrangler.jsonc`, this README, `.wrangler/`, `index.ts` and
`worker-configuration.d.ts` out of the upload. The config and README
would otherwise be fetchable at `flarepeek.com/wrangler.jsonc` and `/README.md`. `.wrangler/` is the
nastier one: `pnpm site:dev` writes miniflare's local state into `site/.wrangler/`, _inside_ the
asset directory, so previewing the site would publish those `.sqlite` files to production on the
next deploy. It happened once. Note that `wrangler deploy`'s "Read N files" line counts files
**before** `.assetsignore` is applied, so it can't be used to confirm an exclusion worked — check
with `curl` instead.

The first deploy needs `wrangler login` (or a `CLOUDFLARE_API_TOKEN` in the environment) — note
wrangler v4 warns that the older `CF_API_TOKEN` name is deprecated.
