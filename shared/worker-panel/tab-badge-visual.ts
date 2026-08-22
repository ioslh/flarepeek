import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import type { TabBadgeState } from '@/shared/worker-panel/tab-badge-state';

// Tailwind's default palette (this project uses it unmodified — no custom
// theme in any style.css) — reused here instead of picked by hand so the dot
// colors visually match the red-600/neutral-400/etc. already used for error
// and muted text elsewhere in the UI.
const NEUTRAL_GRAY = '#a3a3a3'; // neutral-400
const SUCCESS_GREEN = '#16a34a'; // green-600
const ERROR_RED = '#dc2626'; // red-600

export interface TabBadgeVisual {
  // null = no dot, use the plain icon as-is.
  dotColor: string | null;
  titleKey:
    | 'extensionName'
    | 'badgeTitleNoToken'
    | 'versionSwitcherWorkerLabel'
    | ReturnType<typeof cloudflareErrorMessageKey>;
  titleParams?: string[];
}

// Pure state -> visual mapping, deliberately with zero chrome.* dependency —
// entrypoints/background/tab-badge/render-badge-for-state.ts is the only
// place that turns this into an actual chrome.action call, so swapping the
// rendering mechanism only ever means changing that one file.
export function tabBadgeVisual(state: TabBadgeState): TabBadgeVisual {
  switch (state.status) {
    // Deliberately identical and deliberately unalarming: neither is an
    // error, both mean "nothing relevant to show for this tab" (see the
    // no-match/not-applicable note on TabBadgeState).
    case 'not-applicable':
    case 'no-match':
      return { dotColor: null, titleKey: 'extensionName' };
    case 'no-token':
      return { dotColor: NEUTRAL_GRAY, titleKey: 'badgeTitleNoToken' };
    case 'matched':
      return {
        dotColor: SUCCESS_GREEN,
        titleKey: 'versionSwitcherWorkerLabel',
        titleParams: [state.workerName],
      };
    case 'error':
      return { dotColor: ERROR_RED, titleKey: cloudflareErrorMessageKey(state.kind) };
  }
}
