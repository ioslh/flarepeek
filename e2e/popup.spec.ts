import { test, expect } from './fixtures';

test('popup loads and renders the heading', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading')).toBeVisible();
});
