import { describe, expect, it } from 'vitest';
import {
  addPinnedTab,
  getPinnedTabs,
  removePinnedTab,
  setPinnedTabForcedToken,
} from '@/shared/storage/pinned-tabs-storage';

describe('pinned-tabs-storage', () => {
  it('starts empty', async () => {
    expect(await getPinnedTabs()).toEqual([]);
  });

  it('adds a pinned tab with no forced token by default', async () => {
    await addPinnedTab('a.com');
    expect(await getPinnedTabs()).toEqual([{ hostname: 'a.com', forcedTokenId: null }]);
  });

  it('does not add a duplicate for an already-pinned hostname', async () => {
    await addPinnedTab('a.com');
    await addPinnedTab('a.com');
    const tabs = await getPinnedTabs();
    expect(tabs.filter((t) => t.hostname === 'a.com')).toHaveLength(1);
  });

  it('preserves insertion order across multiple adds', async () => {
    await addPinnedTab('a.com');
    await addPinnedTab('b.com');
    await addPinnedTab('c.com');
    expect((await getPinnedTabs()).map((t) => t.hostname)).toEqual(['a.com', 'b.com', 'c.com']);
  });

  it('removes a pinned tab by hostname', async () => {
    await addPinnedTab('a.com');
    await addPinnedTab('b.com');
    await removePinnedTab('a.com');
    expect((await getPinnedTabs()).map((t) => t.hostname)).toEqual(['b.com']);
  });

  it('sets a forced token for one tab without touching others', async () => {
    await addPinnedTab('a.com');
    await addPinnedTab('b.com');
    await setPinnedTabForcedToken('a.com', 'token-1');

    const tabs = await getPinnedTabs();
    expect(tabs.find((t) => t.hostname === 'a.com')?.forcedTokenId).toBe('token-1');
    expect(tabs.find((t) => t.hostname === 'b.com')?.forcedTokenId).toBeNull();
  });
});
