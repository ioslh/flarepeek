import { Maximize2, Settings } from 'lucide-react';
import { useTokens } from '@/shared/storage/use-tokens';
import { useLiveTabHostname } from '@/shared/worker-panel/use-live-tab-hostname';
import { useWorkerLookup } from '@/shared/worker-panel/use-worker-lookup';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { useRecentVersions } from '@/shared/worker-panel/use-recent-versions';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { WorkerBreadcrumb } from '@/shared/worker-panel/worker-breadcrumb';
import { NoTokenEmptyState } from '@/shared/worker-panel/no-token-empty-state';
import { AccountBadge } from '@/entrypoints/popup/account-badge';
import { DashboardMenu } from '@/entrypoints/sidepanel/dashboard-menu';
import { DeploymentBarTrack } from '@/entrypoints/sidepanel/version-switcher/deployment-bar-track';
import { VersionSlot } from '@/entrypoints/sidepanel/version-switcher/version-slot';
import { computeVersionRoles } from '@/entrypoints/sidepanel/version-switcher/version-roles';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
import { openFullPanel } from '@/entrypoints/popup/open-full-panel';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import type { DisplayVersion } from '@/shared/worker-panel/display-version';

// A read-only glance at the current site: who serves it, how traffic is split
// right now, and the one high-frequency action — pinning a version to your
// own browser.
//
// Still deliberately lean, per AGENTS.md: no stats, no bindings, no gradual
// deployment control, no editing of any kind. Anything that changes live
// traffic, and anything that costs more requests to answer, belongs in the
// side panel.
export function PopupApp() {
  const tokens = useTokens();
  const hostname = useLiveTabHostname();
  // No account-switching UI in popup (see AccountBadge — read-only), so this
  // is always the auto-detected token; forcing is a side-panel-only concern.
  const lookup = useWorkerLookup(hostname, tokens);
  const resolvedForHooks = lookup.status === 'ready' ? lookup.resolved : null;
  const deployment = useDeploymentVersions(resolvedForHooks);
  // The one request the popup takes on beyond identifying the Worker. Without
  // it the versions render as bare hashes, which say nothing about which
  // build they are — the same problem the version picker had.
  const recentVersions = useRecentVersions(resolvedForHooks);
  const override = useVersionOverride(hostname ?? null);
  const previewConfig = usePreviewUrlConfig(resolvedForHooks);
  // Best-guess account label before the lookup resolves — the first stored
  // token is the one auto-detection tries first anyway (see
  // resolveWorkerForHostname's site-token-cache ordering), so this isn't a
  // wild guess, just shown a beat earlier than strictly confirmed.
  const accountToken = lookup.status === 'ready' ? lookup.resolved.token : tokens?.[0];

  const live = deployment.status === 'ready' ? deployment.versions : [];
  const previousVersions = deployment.status === 'ready' ? deployment.previousVersions : null;
  const currentDeploymentId = deployment.status === 'ready' ? deployment.history[0]?.id : undefined;

  const metaById = new Map(
    recentVersions.status === 'ready' ? recentVersions.versions.map((v) => [v.id, v]) : [],
  );
  const liveDisplay: DisplayVersion[] = live.map((version) => {
    const meta = metaById.get(version.versionId);
    return {
      versionId: version.versionId,
      percentage: version.percentage,
      tag: meta?.tag ?? null,
      message: meta?.message ?? null,
      createdOn: meta?.createdOn ?? null,
      authorEmail: meta?.authorEmail ?? null,
    };
  });

  const roles = computeVersionRoles(live, previousVersions);
  const hasSlotB = live.length === 2;

  return (
    <TooltipProvider delayDuration={300}>
      <main className="flex w-80 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          {/* WorkerBreadcrumb is shared with the side panel, where it is the
              tab's content title and sized accordingly. In a 320px popup that
              treatment is far too large, so it is scaled back here. */}
          {lookup.status === 'ready' ? (
            <WorkerBreadcrumb
              worker={lookup.resolved.worker}
              className="flex-1 text-sm font-normal normal-case"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">
              {hostname ?? browser.i18n.getMessage('sidepanelHeading')}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => browser.runtime.openOptionsPage()}
                  aria-label={browser.i18n.getMessage('sidepanelOpenSettings')}
                >
                  <Settings className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{browser.i18n.getMessage('sidepanelOpenSettings')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void openFullPanel(hostname)}
                  aria-label={browser.i18n.getMessage('popupOpenFullPanel')}
                >
                  <Maximize2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{browser.i18n.getMessage('popupOpenFullPanel')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {lookup.status === 'ready' && <DashboardMenu worker={lookup.resolved.worker} />}

        {tokens && tokens.length > 1 && accountToken && (
          <AccountBadge resolvedToken={accountToken} />
        )}

        {tokens && tokens.length === 0 && <NoTokenEmptyState />}

        {tokens && tokens.length > 0 && lookup.status === 'loading' && (
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('versionSwitcherLoading')}
          </p>
        )}

        {lookup.status === 'not-a-worker-site' && (
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('versionSwitcherNotAWorkerSite')}
          </p>
        )}

        {lookup.status === 'error' && (
          <p className="text-sm text-red-600">
            {browser.i18n.getMessage(cloudflareErrorMessageKey(lookup.kind))}
          </p>
        )}

        {lookup.status === 'ready' && deployment.status === 'ready' && live.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {currentDeploymentId && (
              <p className="font-mono text-xs text-foreground">
                {browser.i18n.getMessage(
                  'deploymentBarHeadingCurrent',
                  currentDeploymentId.slice(0, 8),
                )}
              </p>
            )}

            {/* The same track the side panel uses. Its label placement is
                measured against the real track width rather than assumed, so
                it adapts to the popup's narrower 288px without changes. */}
            <DeploymentBarTrack
              percentageB={hasSlotB ? live[1]!.percentage : null}
              editable={false}
            />

            <div className="flex items-start gap-3">
              <VersionSlot
                mode="view"
                align="left"
                version={liveDisplay[0]!}
                role={roles[0]!}
                canPin={hasSlotB}
                errorRate={null}
                isPinned={override.activeVersionId === live[0]!.versionId}
                isPinBusy={override.activation.status === 'requesting'}
                previewUrl={
                  previewConfig ? buildVersionPreviewUrl(previewConfig, live[0]!.versionId) : null
                }
                onTogglePin={() =>
                  override.activeVersionId === live[0]!.versionId
                    ? void override.deactivate()
                    : void override.activate(lookup.resolved.worker.scriptName, live[0]!.versionId)
                }
              />

              {hasSlotB && (
                <VersionSlot
                  mode="view"
                  align="right"
                  version={liveDisplay[1]!}
                  role={roles[1]!}
                  canPin
                  errorRate={null}
                  isPinned={override.activeVersionId === live[1]!.versionId}
                  isPinBusy={override.activation.status === 'requesting'}
                  previewUrl={
                    previewConfig ? buildVersionPreviewUrl(previewConfig, live[1]!.versionId) : null
                  }
                  onTogglePin={() =>
                    override.activeVersionId === live[1]!.versionId
                      ? void override.deactivate()
                      : void override.activate(
                          lookup.resolved.worker.scriptName,
                          live[1]!.versionId,
                        )
                  }
                />
              )}
            </div>

            {override.activation.status === 'permission-denied' && (
              <p className="text-xs text-destructive">
                {browser.i18n.getMessage('versionSwitcherPermissionDenied')}
              </p>
            )}
            {override.activation.status === 'error' && (
              <p className="text-xs text-destructive">
                {browser.i18n.getMessage('versionSwitcherActivationError')}
              </p>
            )}
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}
