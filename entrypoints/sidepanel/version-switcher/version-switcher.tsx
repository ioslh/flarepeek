import { DeploymentBar } from '@/entrypoints/sidepanel/version-switcher/deployment-bar';
import { RecentErrorsPanel } from '@/entrypoints/sidepanel/recent-errors/recent-errors-panel';
import { BindingsPanel } from '@/entrypoints/sidepanel/bindings/bindings-panel';
import { WorkerStatsCard } from '@/entrypoints/sidepanel/version-switcher/worker-stats-card';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import type { WorkerLookupState } from '@/shared/worker-panel/use-worker-lookup';

interface VersionSwitcherProps {
  lookup: WorkerLookupState;
  // The hostname this pane is showing — see entrypoints/sidepanel/tabs/panel-tab-pane.tsx.
  hostname: string | null | undefined;
  refreshKey: number;
  onRefresh: () => void;
}

// The content body for a resolved (or resolving) worker — identity, pin
// staleness, and account switching all live one level up in
// entrypoints/sidepanel/tabs/panel-tab-pane.tsx now, since AccountControl
// needs the same resolved-token state regardless of whether a worker has
// matched yet.
export function VersionSwitcher({ lookup, hostname, refreshKey, onRefresh }: VersionSwitcherProps) {
  // Only reachable in theory — the dynamic tab's manual-detection mode
  // (the only caller of useWorkerLookup that can produce 'idle') renders its
  // own pending placeholder instead of this component while idle. Handled
  // here anyway so this stays exhaustive over WorkerLookupState.
  if (lookup.status === 'idle' || lookup.status === 'loading') {
    return (
      <p className="text-sm text-neutral-500">
        {browser.i18n.getMessage('versionSwitcherLoading')}
      </p>
    );
  }

  if (lookup.status === 'not-a-worker-site') {
    return (
      <p className="text-sm text-neutral-500">
        {browser.i18n.getMessage('versionSwitcherNotAWorkerSite')}
      </p>
    );
  }

  // sidepanel-app.tsx only renders this once at least one token is saved, so
  // this is a brief race rather than a state worth its own message.
  if (lookup.status === 'no-token') {
    return null;
  }

  if (lookup.status === 'error') {
    return (
      <p className="text-sm text-red-600">
        {browser.i18n.getMessage(cloudflareErrorMessageKey(lookup.kind))}
      </p>
    );
  }

  const { resolved } = lookup;

  return (
    // divide-y draws the one thin rule between sections; each PanelSection
    // brings its own vertical padding, so no gap is needed and no section
    // needs a border of its own. Sections that render null (stats before
    // they load, bindings when there are none) simply don't produce a rule.
    <div className="flex flex-col divide-y divide-border">
      {/* Deployment first: it is both the signature element and the most
          actionable one. Stats answer "is the site healthy overall", which
          is background — the rollout's own health now reads off the version
          legs inside the bar. Errors and bindings are reference detail. */}
      <DeploymentBar
        resolved={resolved}
        hostname={hostname}
        refreshKey={refreshKey}
        onRefresh={onRefresh}
      />

      <WorkerStatsCard resolved={resolved} />

      <RecentErrorsPanel resolved={resolved} />

      <BindingsPanel resolved={resolved} />
    </div>
  );
}
