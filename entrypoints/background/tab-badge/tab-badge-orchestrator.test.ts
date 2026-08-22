import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { addToken } from '@/shared/storage/token-storage';
import { renderBadgeForState } from '@/entrypoints/background/tab-badge/render-badge-for-state';
import { initTabBadgeOrchestrator } from '@/entrypoints/background/tab-badge/tab-badge-orchestrator';

// The orchestrator's own job is event wiring + dedup, not "does the state
// computation or the actual icon drawing come out right" — those are covered
// separately (tab-badge-state.test.ts, tab-badge-visual.test.ts). Mocking
// computeTabBadgeState keeps these tests deterministic and network-free;
// mocking renderBadgeForState avoids icon-overlay.ts's OffscreenCanvas/fetch
// dependency, which vitest's environment doesn't provide at all (see the
// plan's testing notes — that file can only be verified manually).
vi.mock('@/shared/worker-panel/tab-badge-state', () => ({
  computeTabBadgeState: vi.fn().mockResolvedValue({ status: 'no-token' }),
}));
vi.mock('@/entrypoints/background/tab-badge/render-badge-for-state', () => ({
  renderBadgeForState: vi.fn(),
}));

// The orchestrator's listeners fire-and-forget their async work (`void
// refreshTabBadge(...)`), so triggering an event doesn't wait for the
// resulting getTabHostname -> getTokens -> computeTabBadgeState ->
// renderBadgeForState chain to finish. A macrotask tick is enough to drain it.
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// fakeBrowser.reset() (global beforeEach, vitest.setup.ts) wipes every
// registered listener, including these — so the orchestrator has to be
// (re)initialized after that reset runs, in this file's own beforeEach.
beforeEach(() => {
  vi.mocked(renderBadgeForState).mockClear();
  initTabBadgeOrchestrator();
});

describe('initTabBadgeOrchestrator', () => {
  it('renders a badge for the tab that becomes active', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example-1.com', active: true });
    await flush();

    expect(renderBadgeForState).toHaveBeenCalledWith(tab.id, { status: 'no-token' });
  });

  it('skips recomputing when onUpdated fires again for the same hostname', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example-2.com', active: true });
    await flush();
    vi.mocked(renderBadgeForState).mockClear();

    const currentTab = await fakeBrowser.tabs.get(tab.id!);
    await fakeBrowser.tabs.onUpdated.trigger(tab.id!, { status: 'complete' }, currentTab!);
    await flush();

    expect(renderBadgeForState).not.toHaveBeenCalled();
  });

  it('recomputes when onUpdated fires with a genuinely new hostname', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example-3.com', active: true });
    await flush();
    vi.mocked(renderBadgeForState).mockClear();

    // status doesn't accompany a URL change in chrome.tabs.update's own type
    // (real Chrome fires those as separate onUpdated events too) — update the
    // stored tab URL first, then trigger the "load finished" event manually.
    await fakeBrowser.tabs.update(tab.id!, { url: 'https://example-4.com' });
    const currentTab = await fakeBrowser.tabs.get(tab.id!);
    await fakeBrowser.tabs.onUpdated.trigger(tab.id!, { status: 'complete' }, currentTab!);
    await flush();

    expect(renderBadgeForState).toHaveBeenCalledWith(tab.id, { status: 'no-token' });
  });

  it('ignores onUpdated for a tab that is not the active one', async () => {
    const bgTab = await fakeBrowser.tabs.create({ url: 'https://example-5.com', active: false });
    await flush();
    vi.mocked(renderBadgeForState).mockClear();

    const currentTab = await fakeBrowser.tabs.get(bgTab.id!);
    await fakeBrowser.tabs.onUpdated.trigger(bgTab.id!, { status: 'complete' }, currentTab!);
    await flush();

    expect(renderBadgeForState).not.toHaveBeenCalled();
  });

  it('force-refreshes the active tab when the stored tokens change', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example-6.com', active: true });
    await flush();
    vi.mocked(renderBadgeForState).mockClear();

    await addToken({ token: 'cf-token', label: 'test', email: null });
    await vi.waitFor(() =>
      expect(renderBadgeForState).toHaveBeenCalledWith(tab.id, expect.anything()),
    );
  });

  it('clears its dedup entry on tab removal, so a later activation on the same hostname still recomputes', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example-7.com', active: true });
    await flush();
    vi.mocked(renderBadgeForState).mockClear();

    // fakeBrowser.tabs.remove() doesn't reliably model the tab/window
    // bookkeeping for a tab created without an explicit windowId, so this
    // triggers the onRemoved event directly rather than a real removal —
    // what's under test is the orchestrator's own cleanup, not fakeBrowser's
    // tab/window plumbing.
    await fakeBrowser.tabs.onRemoved.trigger(tab.id!, {
      isWindowClosing: false,
      windowId: tab.windowId,
    });
    // Without that cleanup, reactivating the same tab id on the same
    // hostname would be deduped (see the "same hostname" test above) — this
    // proves the dedup entry was actually cleared, not just that the event
    // fired without error.
    await fakeBrowser.tabs.onActivated.trigger({ tabId: tab.id!, windowId: tab.windowId });
    await flush();

    expect(renderBadgeForState).toHaveBeenCalledWith(tab.id, { status: 'no-token' });
  });
});
