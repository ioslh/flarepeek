import { describe, expect, it } from 'vitest';
import { tabBadgeVisual } from '@/shared/worker-panel/tab-badge-visual';

describe('tabBadgeVisual', () => {
  it('gives not-applicable and no-match the exact same neutral visual', () => {
    expect(tabBadgeVisual({ status: 'not-applicable' })).toEqual(
      tabBadgeVisual({ status: 'no-match' }),
    );
    expect(tabBadgeVisual({ status: 'no-match' })).toEqual({
      dotColor: null,
      titleKey: 'extensionName',
    });
  });

  it('is distinct from no-token and error', () => {
    const neutral = tabBadgeVisual({ status: 'no-match' });
    const noToken = tabBadgeVisual({ status: 'no-token' });
    const error = tabBadgeVisual({ status: 'error', kind: 'unauthenticated' });

    expect(noToken).not.toEqual(neutral);
    expect(error).not.toEqual(neutral);
    expect(noToken).not.toEqual(error);
  });

  it('shows a gray dot with the no-token title when no token is configured', () => {
    expect(tabBadgeVisual({ status: 'no-token' })).toEqual({
      dotColor: '#a3a3a3',
      titleKey: 'badgeTitleNoToken',
    });
  });

  it('shows a green dot with the worker name when matched', () => {
    expect(
      tabBadgeVisual({ status: 'matched', workerName: 'my-worker', zoneName: 'example.com' }),
    ).toEqual({
      dotColor: '#16a34a',
      titleKey: 'versionSwitcherWorkerLabel',
      titleParams: ['my-worker'],
    });
  });

  it('shows a red dot with the kind-specific title on error', () => {
    expect(tabBadgeVisual({ status: 'error', kind: 'forbidden' })).toEqual({
      dotColor: '#dc2626',
      titleKey: 'versionSwitcherErrorForbidden',
    });
    expect(tabBadgeVisual({ status: 'error', kind: 'network' })).toEqual({
      dotColor: '#dc2626',
      titleKey: 'versionSwitcherErrorNetwork',
    });
  });
});
