# FlarePeek

English | [简体中文](./README.zh-CN.md)

A Chrome extension for Cloudflare Workers developers. Once you're signed in with your Cloudflare account and open a zone hostname served by a Worker, FlarePeek automatically identifies the Worker and gives you development tools right there — for example, temporarily routing a production hostname's traffic to a specific preview version (built on [Version Overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)), inspecting gradual-deployment status, and viewing Worker request/error metrics.

## Tech stack

These are the one-time technology choices made when the project started; don't switch away from them mid-project without a good reason. The long-standing coding conventions live in [AGENTS.md](./AGENTS.md).

| Category              | Choice                                                                                                                                     | Notes                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extension framework   | [WXT](https://wxt.dev/)                                                                                                                    | Actively maintained, Vite-powered, cross-browser, small bundle size. Plasmo's own maintainers describe it as lightly maintained now, so it wasn't chosen.                                                                                                                                 |
| Language              | TypeScript                                                                                                                                 | Mandatory project-wide; `any` is banned.                                                                                                                                                                                                                                                  |
| UI framework          | React                                                                                                                                      | Largest ecosystem, most AI-assisted-coding material available.                                                                                                                                                                                                                            |
| Styling               | Tailwind CSS                                                                                                                               | Utility-first, well suited to iterating quickly on the small UI surfaces inside an extension.                                                                                                                                                                                             |
| Component library     | [shadcn/ui](https://ui.shadcn.com/) ([Radix Primitives](https://www.radix-ui.com/) + Tailwind) + [lucide-react](https://lucide.dev/) icons | Generated into `shared/ui/` as source-level components, not a runtime dependency; built on top of the already-locked-in Tailwind rather than replacing it, and provides accessible Dialog/Popover/DropdownMenu primitives instead of hand-rolling focus-trap/Escape-to-close logic again. |
| Package manager       | pnpm                                                                                                                                       | The default used by WXT's own official examples.                                                                                                                                                                                                                                          |
| Lint / Format         | ESLint 9 + Prettier                                                                                                                        | `eslint-plugin-react` 7.x isn't runtime-compatible with ESLint 10's flat config (`context.getFilename is not a function`), so this is pinned to ESLint 9 for now — revisit once that plugin ships support for 10.                                                                         |
| Manifest version      | MV3                                                                                                                                        | MV2 support has ended.                                                                                                                                                                                                                                                                    |
| Cloudflare API client | The official [`cloudflare`](https://www.npmjs.com/package/cloudflare) npm SDK                                                              | Fully typed, avoids hand-rolling a fetch wrapper and tracking API version changes ourselves.                                                                                                                                                                                              |
| State management      | WXT's `storage` API + React Context                                                                                                        | No extra state library for now; revisit Zustand only if this genuinely gets more complex.                                                                                                                                                                                                 |
| Testing               | Vitest (unit) + Playwright (e2e, with Chrome extension testing support)                                                                    |                                                                                                                                                                                                                                                                                           |
| i18n                  | `browser.i18n` + `public/_locales/`                                                                                                        | Wired in from day one; `_locales` has to live under `public/` for WXT to pick it up and generate types.                                                                                                                                                                                   |
| Project layout        | Single repo                                                                                                                                | Not split into a monorepo for now.                                                                                                                                                                                                                                                        |

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
