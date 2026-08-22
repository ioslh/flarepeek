import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { useDeploymentActions } from '@/entrypoints/sidepanel/version-switcher/use-deployment-actions';
import { useRecentVersions } from '@/entrypoints/sidepanel/version-switcher/use-recent-versions';
import { buildUnifiedVersions } from '@/entrypoints/sidepanel/version-switcher/versions-list-utils';
import { VersionsList } from '@/entrypoints/sidepanel/version-switcher/versions-list';
import { DeploymentControl } from '@/entrypoints/sidepanel/version-switcher/deployment-control';
import { RecentErrorsPanel } from '@/entrypoints/sidepanel/recent-errors/recent-errors-panel';
import { BindingsPanel } from '@/entrypoints/sidepanel/bindings/bindings-panel';
import { WorkerStatsCard } from '@/entrypoints/sidepanel/version-switcher/worker-stats-card';
import { SectionCard } from '@/entrypoints/sidepanel/section-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/ui/utils';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';
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
  // Fetched once here (not inside a child panel) so the same data can enrich
  // *both* the unified versions list below and the DeploymentControl's
  // candidate pool — this is a sidepanel-only file, so popup never pays for
  // this fetch.
  const recentVersions = useRecentVersions(resolvedForHooks);
  const [isManaging, setIsManaging] = useState(false);

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

  const { live, recent } = buildUnifiedVersions(deployment, recentVersions);
  // DeploymentControl's combobox candidates need DisplayVersion's shape, but
  // a candidate that isn't currently live has no meaningful percentage yet
  // — null here is never actually displayed for candidates (see
  // version-combobox.tsx, which only shows tag/hash).
  const candidateVersions: DisplayVersion[] =
    recentVersions.status === 'ready'
      ? recentVersions.versions.map((version) => ({
          versionId: version.id,
          percentage: null,
          tag: version.tag,
          message: version.message,
          createdOn: version.createdOn,
          everDeployed: version.everDeployed,
        }))
      : [];

  return (
    <div className="flex flex-col gap-3">
      <WorkerStatsCard resolved={resolved} />

      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center justify-between px-4">
          <CardTitle>{browser.i18n.getMessage('versionSwitcherVersionsHeading')}</CardTitle>
          {deployment.status === 'ready' && (
            <Button
              variant="outline"
              size="sm"
              aria-expanded={isManaging}
              onClick={() => setIsManaging((open) => !open)}
            >
              {browser.i18n.getMessage('deploymentControlManageDeployment')}
              <ChevronDown
                className={cn('size-4 transition-transform', isManaging && 'rotate-180')}
              />
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-4">
          {deployment.status === 'loading' && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {deployment.status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                {browser.i18n.getMessage(cloudflareErrorMessageKey(deployment.kind))}
              </AlertDescription>
            </Alert>
          )}

          {deployment.status === 'ready' && live.length === 0 && recent.length === 0 && (
            <p className="text-sm text-neutral-500">
              {browser.i18n.getMessage('versionSwitcherNoVersions')}
            </p>
          )}

          {deployment.status === 'ready' && (live.length > 0 || recent.length > 0) && (
            <VersionsList
              live={live}
              recent={recent}
              activeVersionId={override.activeVersionId}
              isActivationRequesting={override.activation.status === 'requesting'}
              previewConfig={previewConfig}
              onActivate={(versionId) => void override.activate(worker.scriptName, versionId)}
              onDeactivate={() => void override.deactivate()}
            />
          )}

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

          {deployment.status === 'ready' && (
            <Collapsible open={isManaging} onOpenChange={setIsManaging}>
              <CollapsibleContent className="border-t border-border pt-3">
                <DeploymentControl
                  liveVersions={live}
                  candidates={candidateVersions}
                  isSubmitting={deploymentActions.state.status === 'submitting'}
                  onApply={(versions, message) =>
                    void deploymentActions.applySplit(versions, message)
                  }
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {deploymentActions.state.status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                {browser.i18n.getMessage(cloudflareErrorMessageKey(deploymentActions.state.kind))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <RecentErrorsPanel resolved={resolved} />

      <SectionCard tone="muted">
        <BindingsPanel resolved={resolved} />
      </SectionCard>
    </div>
  );
}
