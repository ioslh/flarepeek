import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { useDeploymentActions } from '@/entrypoints/sidepanel/version-switcher/use-deployment-actions';
import { VersionRow } from '@/shared/worker-panel/version-row';
import { DeploymentSplitControl } from '@/entrypoints/sidepanel/version-switcher/deployment-split-control';
import { RecentVersionsPanel } from '@/entrypoints/sidepanel/version-switcher/recent-versions-panel';
import { RecentErrorsPanel } from '@/entrypoints/sidepanel/recent-errors/recent-errors-panel';
import { BindingsPanel } from '@/entrypoints/sidepanel/bindings/bindings-panel';
import { WorkerStatsCard } from '@/entrypoints/sidepanel/version-switcher/worker-stats-card';
import { SectionCard } from '@/entrypoints/sidepanel/section-card';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
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
  const resolvedForHooks = lookup.status === 'ready' ? lookup.resolved : null;
  const deployment = useDeploymentVersions(resolvedForHooks, refreshKey);
  const override = useVersionOverride(hostname ?? null);
  const previewConfig = usePreviewUrlConfig(resolvedForHooks);
  const deploymentActions = useDeploymentActions(resolvedForHooks, onRefresh);

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
  const { worker } = resolved;

  return (
    <div className="flex flex-col gap-3">
      <WorkerStatsCard resolved={resolved} />

      <SectionCard tone="primary">
        <p className="text-xs font-medium text-neutral-400 uppercase">
          {browser.i18n.getMessage('versionSwitcherVersionsHeading')}
        </p>

        {deployment.status === 'loading' && (
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('versionSwitcherLoading')}
          </p>
        )}

        {deployment.status === 'error' && (
          <p className="text-sm text-red-600">
            {browser.i18n.getMessage(cloudflareErrorMessageKey(deployment.kind))}
          </p>
        )}

        {deployment.status === 'ready' && deployment.versions.length === 0 && (
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('versionSwitcherNoVersions')}
          </p>
        )}

        {deployment.status === 'ready' && deployment.versions.length > 0 && (
          <div className="flex flex-col gap-2">
            {deployment.versions.map((version) => (
              <VersionRow
                key={version.versionId}
                version={version}
                isActive={override.activeVersionId === version.versionId}
                isRequesting={override.activation.status === 'requesting'}
                previewUrl={
                  previewConfig ? buildVersionPreviewUrl(previewConfig, version.versionId) : null
                }
                onActivate={() => void override.activate(worker.scriptName, version.versionId)}
                onDeactivate={() => void override.deactivate()}
              />
            ))}
            {override.activation.status === 'permission-denied' && (
              <p className="text-sm text-red-600">
                {browser.i18n.getMessage('versionSwitcherPermissionDenied')}
              </p>
            )}
            {override.activation.status === 'error' && (
              <p className="text-sm text-red-600">
                {browser.i18n.getMessage('versionSwitcherActivationError')}
              </p>
            )}
          </div>
        )}

        {deployment.status === 'ready' && deployment.versions.length === 2 && (
          <DeploymentSplitControl
            versions={deployment.versions}
            isSubmitting={deploymentActions.state.status === 'submitting'}
            onApply={(versions) => void deploymentActions.applySplit(versions)}
          />
        )}

        {deploymentActions.state.status === 'error' && (
          <p className="text-sm text-red-600">
            {browser.i18n.getMessage(cloudflareErrorMessageKey(deploymentActions.state.kind))}
          </p>
        )}
      </SectionCard>

      <RecentVersionsPanel
        resolved={resolved}
        deployment={deployment}
        previewConfig={previewConfig}
      />

      <RecentErrorsPanel resolved={resolved} />

      <SectionCard tone="muted">
        <BindingsPanel resolved={resolved} />
      </SectionCard>
    </div>
  );
}
