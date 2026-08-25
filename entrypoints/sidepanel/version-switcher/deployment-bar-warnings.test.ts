import { describe, expect, it } from 'vitest';
import { computeDeploymentBarWarnings } from '@/entrypoints/sidepanel/version-switcher/deployment-bar-warnings';

const base = {
  liveSlotAVersionId: 'v1',
  liveSlotBPercentage: 40,
  draftSlotAVersionId: 'v1',
  draftSlotBVersionId: 'v2',
  draftPercentage: 40,
};

describe('computeDeploymentBarWarnings', () => {
  it('returns no warnings when the draft matches what is live', () => {
    expect(computeDeploymentBarWarnings(base)).toEqual([]);
  });

  it('flags a retreat when the draft percentage is below the live one', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftPercentage: 25 })).toEqual([
      { id: 'retreat', tone: 'danger' },
    ]);
  });

  it('does not flag a retreat for an advance above the live percentage', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftPercentage: 75 })).toEqual([]);
  });

  it('flags push-to-full when slot B is drafted to 100%', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftPercentage: 100 })).toEqual([
      { id: 'push-to-full', tone: 'caution' },
    ]);
  });

  it('flags zero-still-pinnable when slot B is drafted to 0% but still present', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftPercentage: 0 })).toEqual([
      { id: 'retreat', tone: 'danger' },
      { id: 'zero-still-pinnable', tone: 'info' },
    ]);
  });

  it('does not flag push-to-full or zero-still-pinnable when slot B is empty (100% goes to slot A)', () => {
    expect(
      computeDeploymentBarWarnings({ ...base, draftSlotBVersionId: null, draftPercentage: 0 }),
    ).toEqual([]);
  });

  it('flags slot-a-changed when slot A no longer matches the live version', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftSlotAVersionId: 'v3' })).toEqual([
      { id: 'slot-a-changed', tone: 'danger' },
    ]);
  });

  it('does not flag slot-a-changed on a never-deployed Worker (no live slot A)', () => {
    expect(
      computeDeploymentBarWarnings({
        ...base,
        liveSlotAVersionId: null,
        draftSlotAVersionId: 'v1',
      }),
    ).toEqual([]);
  });

  it('flags affinity when a single-version deployment gains a real split', () => {
    expect(
      computeDeploymentBarWarnings({
        liveSlotAVersionId: 'v1',
        liveSlotBPercentage: 0,
        draftSlotAVersionId: 'v1',
        draftSlotBVersionId: 'v2',
        draftPercentage: 25,
      }),
    ).toContainEqual({ id: 'affinity', tone: 'danger' });
  });

  it('flags affinity when a 0% smoke test is pushed to real traffic', () => {
    // Two versions were already deployed, but all traffic went to one of
    // them — this is the deploy where it actually starts splitting.
    expect(
      computeDeploymentBarWarnings({
        liveSlotAVersionId: 'v1',
        liveSlotBPercentage: 0,
        draftSlotAVersionId: 'v1',
        draftSlotBVersionId: 'v2',
        draftPercentage: 40,
      }),
    ).toContainEqual({ id: 'affinity', tone: 'danger' });
  });

  it('stays quiet about affinity once a real split already exists', () => {
    expect(computeDeploymentBarWarnings({ ...base, draftPercentage: 75 })).not.toContainEqual({
      id: 'affinity',
      tone: 'danger',
    });
  });

  it('does not flag affinity for a draft that keeps everything on one version', () => {
    expect(
      computeDeploymentBarWarnings({
        liveSlotAVersionId: 'v1',
        liveSlotBPercentage: 0,
        draftSlotAVersionId: 'v1',
        draftSlotBVersionId: 'v2',
        draftPercentage: 100,
      }),
    ).not.toContainEqual({ id: 'affinity', tone: 'danger' });
  });

  it('does not flag affinity when slot B is left empty', () => {
    expect(
      computeDeploymentBarWarnings({
        liveSlotAVersionId: 'v1',
        liveSlotBPercentage: 0,
        draftSlotAVersionId: 'v1',
        draftSlotBVersionId: null,
        draftPercentage: 40,
      }),
    ).not.toContainEqual({ id: 'affinity', tone: 'danger' });
  });

  it('can flag both retreat and slot-a-changed at once', () => {
    expect(
      computeDeploymentBarWarnings({ ...base, draftSlotAVersionId: 'v3', draftPercentage: 10 }),
    ).toEqual([
      { id: 'retreat', tone: 'danger' },
      { id: 'slot-a-changed', tone: 'danger' },
    ]);
  });
});
