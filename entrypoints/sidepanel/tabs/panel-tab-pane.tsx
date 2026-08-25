import { DashboardMenu } from '@/entrypoints/sidepanel/dashboard-menu';
import { FetchControl } from '@/entrypoints/sidepanel/tabs/fetch-control';
import { ManualDetectionPending } from '@/entrypoints/sidepanel/tabs/manual-detection-pending';
import { useManualDetectionEnabled } from '@/entrypoints/sidepanel/tabs/use-manual-detection';
import { VersionSwitcher } from '@/entrypoints/sidepanel/version-switcher/version-switcher';
import type { StoredToken } from '@/shared/storage/token-storage';
import { cn } from '@/shared/ui/utils';
import { clearWorkerLookupCache, useWorkerLookup } from '@/shared/worker-panel/use-worker-lookup';
import { WorkerBreadcrumb } from '@/shared/worker-panel/worker-breadcrumb';
import { useRef, useState } from 'react';

interface PanelTabPaneProps {
  hostname: string;
  // Callers only ever render a pane once tokens.length > 0 — see
  // sidepanel-app.tsx, which owns the NoTokenEmptyState branch instead.
  tokens: StoredToken[];
  // Owned by the panel level now (entrypoints/sidepanel/tabs/use-panel-tabs.ts)
  // — a pinned tab's lock persists in PinnedTab.forcedTokenId, a dynamic
  // tab's is ephemeral — and surfaced through the header's AccountControl,
  // not this component. Read-only here.
  forcedTokenId: string | null;
  // Pin/unpin now live in the tab strip (entrypoints/sidepanel/tabs/panel-tab-strip.tsx),
  // not here — this only gates manual-detection mode, which is dynamic-tab-only.
  isDynamic: boolean;
  className?: string;
}

// One hostname's worth of content: identity/refresh row + VersionSwitcher.
// refreshKey lives here (not lifted to the panel level) so that keeping this
// component mounted-but-hidden across a tab switch (see sidepanel-app.tsx)
// preserves it for free — no cross-tab state to thread through, no extra
// caching layer needed beyond what useWorkerLookup already does at the
// module level.
export function PanelTabPane({
  hostname,
  tokens,
  forcedTokenId,
  isDynamic,
  className,
}: PanelTabPaneProps) {
  const manualDetectionSetting = useManualDetectionEnabled();

  // Whether *this pane instance* gates its first load behind manual
  // detection — captured once, the first time the setting is known, then
  // frozen for the rest of this instance's life (a pinned pane is never
  // gated at all, decided immediately). Deliberately NOT re-derived from
  // manualDetectionSetting on every render: toggling the setting while this
  // pane is already showing loaded data (or already fetching) must not
  // retroactively hide/reset it. The dynamic pane remounts fresh on every
  // host change (see sidepanel-app.tsx's `key={dynamicHostname}`) — that
  // next fresh mount is where a just-changed setting actually takes effect,
  // not this one.
  const requireManualLoadRef = useRef<boolean | undefined>(isDynamic ? undefined : false);
  if (requireManualLoadRef.current === undefined && manualDetectionSetting !== undefined) {
    requireManualLoadRef.current = manualDetectionSetting;
  }
  const requireManualLoad = requireManualLoadRef.current;

  const [refreshKey, setRefreshKey] = useState(0);
  // Flips true the first time this pane is manually triggered — a pane
  // remounts on every dynamic-hostname change (see sidepanel-app.tsx), so
  // this naturally resets to false for each new host without extra
  // bookkeeping.
  const [manuallyLoaded, setManuallyLoaded] = useState(false);
  // requireManualLoad === undefined: still waiting on the very first read of
  // the setting (only possible for a dynamic pane, only for a moment) — treat
  // as gated rather than briefly auto-fetching and then having to undo it.
  const shouldLoad = requireManualLoad === undefined ? false : !requireManualLoad || manuallyLoaded;

  const lookup = useWorkerLookup(hostname, tokens, forcedTokenId, refreshKey, shouldLoad);

  // The single handler behind both the FetchControl and the
  // ManualDetectionPending placeholder's button — "detect this site for the
  // first time" and "refresh already-loaded data" are the same action, just
  // at different points of the same pane's lifecycle.
  const refresh = () => {
    if (!shouldLoad) {
      setManuallyLoaded(true);
      return;
    }
    clearWorkerLookupCache(hostname);
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className={cn('flex flex-col gap-3 py-4', className)}>
      {/* The navigation row: which Cloudflare asset this is, and the way in
          to its dashboard pages. The hostname is deliberately absent — the
          tab strip above already carries it in large type, and repeating it
          here crowded out the worker/zone identity, which is the scarcer
          information and the thing the dashboard links are keyed on. */}
      <div className="flex items-center gap-2">
        {lookup.status === 'ready' ? (
          <>
            <WorkerBreadcrumb worker={lookup.resolved.worker} className="flex-1" />
            <DashboardMenu worker={lookup.resolved.worker} />
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {hostname}
          </span>
        )}
        <FetchControl
          onRefresh={refresh}
          refreshLabel={shouldLoad ? undefined : browser.i18n.getMessage('panelTabDetectTooltip')}
          detection={isDynamic ? { manualEnabled: manualDetectionSetting === true } : undefined}
        />
      </div>

      {shouldLoad ? (
        <VersionSwitcher
          lookup={lookup}
          hostname={hostname}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((key) => key + 1)}
        />
      ) : (
        <ManualDetectionPending onDetect={refresh} />
      )}
    </div>
  );
}
