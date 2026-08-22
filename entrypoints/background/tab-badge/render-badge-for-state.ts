import { tabBadgeVisual } from '@/shared/worker-panel/tab-badge-visual';
import type { TabBadgeState } from '@/shared/worker-panel/tab-badge-state';
import { iconImageDataFor } from '@/entrypoints/background/tab-badge/icon-overlay';

// The one function that touches chrome.action — everything upstream
// (tabBadgeVisual, computeTabBadgeState) is pure/chrome-free by design, so
// this is the only place a future change to the visual mechanism would touch.
export async function renderBadgeForState(tabId: number, state: TabBadgeState): Promise<void> {
  const visual = tabBadgeVisual(state);
  const title = visual.titleParams
    ? browser.i18n.getMessage(visual.titleKey, visual.titleParams)
    : browser.i18n.getMessage(visual.titleKey);

  await Promise.all([
    chrome.action.setIcon({ tabId, imageData: await iconImageDataFor(visual.dotColor) }),
    chrome.action.setTitle({ tabId, title }),
  ]);
}
