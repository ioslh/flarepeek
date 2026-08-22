import { describe, expect, it } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { extractHttpHostname, getTabHostname } from '@/shared/tabs/tab-hostname';

describe('extractHttpHostname', () => {
  it('extracts the hostname from http(s) URLs', () => {
    expect(extractHttpHostname('https://example.com/path')).toBe('example.com');
    expect(extractHttpHostname('http://sub.example.com')).toBe('sub.example.com');
  });

  it('returns null for non-http(s) schemes', () => {
    expect(extractHttpHostname('chrome://extensions')).toBeNull();
    expect(extractHttpHostname('about:blank')).toBeNull();
    expect(extractHttpHostname('file:///Users/me/index.html')).toBeNull();
  });

  it('returns null for malformed or missing URLs', () => {
    expect(extractHttpHostname('not a url')).toBeNull();
    expect(extractHttpHostname(undefined)).toBeNull();
  });
});

describe('getTabHostname', () => {
  it("returns the tab's hostname when it exists and is http(s)", async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://example.com/dashboard' });
    expect(await getTabHostname(tab.id!)).toBe('example.com');
  });

  it('returns null for a non-http(s) tab', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'chrome://extensions' });
    expect(await getTabHostname(tab.id!)).toBeNull();
  });

  it('returns null when the tab no longer exists', async () => {
    expect(await getTabHostname(999999)).toBeNull();
  });
});
