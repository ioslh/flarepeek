import { describe, expect, it } from 'vitest';
import { resolveActiveTab } from '@/entrypoints/sidepanel/tabs/panel-tabs-state';

describe('resolveActiveTab', () => {
  it('redirects focus to the matching pinned tab when the dynamic tab is active and hits a pinned host', () => {
    const result = resolveActiveTab({
      pinnedHostnames: ['a.com', 'b.com'],
      dynamicHostname: 'a.com',
      activeHostname: 'a.com',
      isActiveDynamic: true,
    });
    expect(result).toEqual({ activeHostname: 'a.com', isActiveDynamic: false });
  });

  it('keeps the dynamic tab active when its content does not match any pinned host', () => {
    const result = resolveActiveTab({
      pinnedHostnames: ['a.com', 'b.com'],
      dynamicHostname: 'c.com',
      activeHostname: 'c.com',
      isActiveDynamic: true,
    });
    expect(result).toEqual({ activeHostname: 'c.com', isActiveDynamic: true });
  });

  it('never steals focus away from a different pinned tab, even on a matching host', () => {
    const result = resolveActiveTab({
      pinnedHostnames: ['a.com', 'b.com'],
      dynamicHostname: 'b.com',
      activeHostname: 'a.com',
      isActiveDynamic: false,
    });
    expect(result).toEqual({ activeHostname: 'a.com', isActiveDynamic: false });
  });

  it('handles a null dynamic hostname (no active http(s) tab) without changing focus', () => {
    const result = resolveActiveTab({
      pinnedHostnames: ['a.com'],
      dynamicHostname: null,
      activeHostname: null,
      isActiveDynamic: true,
    });
    expect(result).toEqual({ activeHostname: null, isActiveDynamic: true });
  });

  it('leaves an already-pinned active tab alone when the dynamic content changes to yet another pinned host', () => {
    const result = resolveActiveTab({
      pinnedHostnames: ['a.com', 'b.com', 'c.com'],
      dynamicHostname: 'c.com',
      activeHostname: 'b.com',
      isActiveDynamic: false,
    });
    expect(result).toEqual({ activeHostname: 'b.com', isActiveDynamic: false });
  });
});
