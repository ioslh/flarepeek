import { Maximize2, Settings } from 'lucide-react';
import { useTokens } from '@/shared/storage/use-tokens';
import { useLiveTabHostname } from '@/shared/worker-panel/use-live-tab-hostname';
import { useWorkerLookup } from '@/shared/worker-panel/use-worker-lookup';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { VersionRow } from '@/shared/worker-panel/version-row';
import { IdentityHeader } from '@/shared/worker-panel/identity-header';
import { NoTokenEmptyState } from '@/shared/worker-panel/no-token-empty-state';
import { AccountBadge } from '@/entrypoints/popup/account-badge';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
import { openFullPanel } from '@/entrypoints/popup/open-full-panel';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

// Deliberately lean: worker identity + the single highest-frequency action
// (one-click version preview). Everything else (stats, bindings, gradual
// deployment control, recent versions/errors, account switching) lives only
// in the side panel — see entrypoints/sidepanel/version-switcher/version-switcher.tsx.
export function PopupApp() {
  const tokens = useTokens();
  const hostname = useLiveTabHostname();
  // No account-switching UI in popup (see AccountBadge — read-only), so this
  // is always the auto-detected token; forcing is a side-panel-only concern.
  const lookup = useWorkerLookup(hostname, tokens);
  const resolvedForHooks = lookup.status === 'ready' ? lookup.resolved : null;
  const deployment = useDeploymentVersions(resolvedForHooks);
  const override = useVersionOverride(hostname ?? null);
  const previewConfig = usePreviewUrlConfig(resolvedForHooks);
  // Best-guess account label before the lookup resolves — the first stored
  // token is the one auto-detection tries first anyway (see
  // resolveWorkerForHostname's site-token-cache ordering), so this isn't a
  // wild guess, just shown a beat earlier than strictly confirmed.
  const accountToken = lookup.status === 'ready' ? lookup.resolved.token : tokens?.[0];

  return (
    <TooltipProvider delayDuration={300}>
      <main className="flex w-80 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          {hostname ? (
            <IdentityHeader
              hostname={hostname}
              worker={lookup.status === 'ready' ? lookup.resolved.worker : null}
            />
          ) : (
            <h1 className="text-sm font-semibold text-neutral-900">
              {browser.i18n.getMessage('sidepanelHeading')}
            </h1>
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

        {lookup.status === 'ready' &&
          deployment.status === 'ready' &&
          deployment.versions.length > 0 && (
            <div className="flex flex-col gap-2">
              {deployment.versions.map((version) => (
                <VersionRow
                  key={version.versionId}
                  // Popup deliberately doesn't fetch version tag/message/
                  // upload-time (see version-switcher.tsx for where the side
                  // panel does) — keeping popup's request count minimal, per
                  // its "quickest glance" role, wins out over richer labels here.
                  version={{
                    ...version,
                    tag: null,
                    message: null,
                    createdOn: null,
                    everDeployed: null,
                  }}
                  isActive={override.activeVersionId === version.versionId}
                  isRequesting={override.activation.status === 'requesting'}
                  previewUrl={
                    previewConfig ? buildVersionPreviewUrl(previewConfig, version.versionId) : null
                  }
                  onActivate={() =>
                    void override.activate(lookup.resolved.worker.scriptName, version.versionId)
                  }
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
      </main>
    </TooltipProvider>
  );
}
