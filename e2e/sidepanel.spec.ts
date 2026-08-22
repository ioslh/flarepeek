import { test, expect } from './fixtures';

test('side panel loads and renders the heading', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.getByRole('heading')).toBeVisible();
});
