import { defineConfig } from '@playwright/test';

// Chrome extension e2e tests must load the built extension from .output/chrome-mv3.
// Run `pnpm build` before `pnpm test:e2e`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
