# FlarePeek

English | [简体中文](./README.zh-CN.md)

A Chrome extension for Cloudflare Workers developers. Once you're signed in with your Cloudflare account and open a zone hostname served by a Worker, FlarePeek automatically identifies the Worker and gives you development tools right there — for example, temporarily routing a production hostname's traffic to a specific preview version (built on [Version Overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)), inspecting gradual-deployment status, and viewing Worker request/error metrics.

## Documentation

- [Tech stack](./docs/tech-stack.md) — the one-time technology choices made when the project started.
- [Cloudflare capability boundaries reference](./docs/cloudflare-reference.md) — official Cloudflare limits that constrain this extension's features.
- [Sidepanel multi-tab design](./docs/sidepanel-tabs-design.md) — the design decisions behind the sidepanel's tab system.
- [AGENTS.md](./AGENTS.md) — the repo's long-standing coding conventions.

## Authentication

Cloudflare doesn't offer a public OAuth client registration flow for third-party apps (the OAuth `wrangler login` uses is an internal Cloudflare-only client). Because of that, this extension signs in with a **scoped API token** instead: the extension links out to the Cloudflare Dashboard with a permission template pre-filled, the user creates a minimal-permission API token there, and pastes it back into the extension to store.

## Development

```sh
pnpm install       # Install dependencies
pnpm dev           # Start the dev server (Chrome, with HMR)
pnpm dev:firefox   # Start the dev server (Firefox)

pnpm compile       # TypeScript type-check
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint autofix
pnpm format        # Prettier format
pnpm format:check  # Check formatting only, don't write

pnpm test          # Vitest unit tests
pnpm test:watch    # Vitest watch mode
pnpm build         # Build the production bundle to .output/chrome-mv3
pnpm test:e2e      # Playwright e2e (needs pnpm build to have produced .output/chrome-mv3 first)

pnpm zip           # Package a zip ready to upload to the Chrome Web Store
```

To load it into Chrome for the first time: run `pnpm build`, then open `chrome://extensions`, enable Developer mode → Load unpacked → select `.output/chrome-mv3`.

## Contributing

Contributions are welcome. Please read [AGENTS.md](./AGENTS.md) for the project's coding conventions before opening a PR — CI runs `pnpm format:check`, `pnpm lint`, `pnpm compile`, `pnpm test`, and `pnpm build` on every pull request.

## License

[MIT](./LICENSE)
