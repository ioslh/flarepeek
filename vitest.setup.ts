import { beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';

// WxtVitest polyfills chrome.* with an in-memory fake that otherwise persists
// across every test in a file — reset it so each test starts from a clean
// chrome.storage.
beforeEach(() => {
  fakeBrowser.reset();
});
