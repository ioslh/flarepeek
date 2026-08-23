import { describe, expect, it } from 'vitest';
import { computeVersionRoles } from '@/entrypoints/sidepanel/version-switcher/version-roles';

describe('computeVersionRoles', () => {
  it('returns keep for a single-version deployment regardless of history', () => {
    expect(computeVersionRoles([{ versionId: 'v1', percentage: 100 }], null)).toEqual(['keep']);
  });

  it('returns unknown for both slots when there is no previous deployment', () => {
    const current = [
      { versionId: 'v1', percentage: 80 },
      { versionId: 'v2', percentage: 20 },
    ];
    expect(computeVersionRoles(current, null)).toEqual(['unknown', 'unknown']);
  });

  it('marks the slot that was already live as keep and the other as new', () => {
    const current = [
      { versionId: 'v1', percentage: 80 },
      { versionId: 'v2', percentage: 20 },
    ];
    const previous = [{ versionId: 'v1', percentage: 100 }];
    expect(computeVersionRoles(current, previous)).toEqual(['keep', 'new']);
  });

  it('marks both slots keep when the version set is unchanged (a percentage-only tweak)', () => {
    const current = [
      { versionId: 'v1', percentage: 60 },
      { versionId: 'v2', percentage: 40 },
    ];
    const previous = [
      { versionId: 'v1', percentage: 75 },
      { versionId: 'v2', percentage: 25 },
    ];
    expect(computeVersionRoles(current, previous)).toEqual(['keep', 'keep']);
  });

  it('falls back to unknown for both slots when the entire version set was swapped', () => {
    const current = [
      { versionId: 'v3', percentage: 50 },
      { versionId: 'v4', percentage: 50 },
    ];
    const previous = [{ versionId: 'v1', percentage: 100 }];
    expect(computeVersionRoles(current, previous)).toEqual(['unknown', 'unknown']);
  });
});
