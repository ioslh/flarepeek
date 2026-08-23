import { DeploymentBar } from '@/entrypoints/sidepanel/version-switcher/deployment-bar';
import { RecentErrorsPanel } from '@/entrypoints/sidepanel/recent-errors/recent-errors-panel';
import { BindingsPanel } from '@/entrypoints/sidepanel/bindings/bindings-panel';
import { WorkerStatsCard } from '@/entrypoints/sidepanel/version-switcher/worker-stats-card';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import type { WorkerLookupState } from '@/shared/worker-panel/use-worker-lookup';

interface VersionSwitcherProps {
  lookup: WorkerLookupState;
  // Pinned hostname (not necessarily the live tab's) — see use-pinned-hostname.ts.
  hostname: string | null | undefined;
  refreshKey: number;
  onRefresh: () => void;
}

// The content body for a resolved (or resolving) worker — identity, pin
// staleness, and account switching all live one level up in sidepanel-app.tsx
// now, since AccountControl needs the same resolved-token state regardless of
// whether a worker has matched yet.
export function VersionSwitcher({ lookup, hostname, refreshKey, onRefresh }: VersionSwitcherProps) {
  if (lookup.status === 'loading') {
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
    <div className="flex flex-col gap-3">
      <WorkerStatsCard resolved={resolved} />

      <DeploymentBar
        resolved={resolved}
        hostname={hostname}
        refreshKey={refreshKey}
        onRefresh={onRefresh}
      />

      <RecentErrorsPanel resolved={resolved} />

      <BindingsPanel resolved={resolved} />
    </div>
  );
}
