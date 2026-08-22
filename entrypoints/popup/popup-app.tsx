import { useTokens } from '@/shared/storage/use-tokens';
import { useLiveTabHostname } from '@/shared/worker-panel/use-live-tab-hostname';
import { useWorkerLookup } from '@/shared/worker-panel/use-worker-lookup';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { VersionRow } from '@/shared/worker-panel/version-row';
import { IdentityHeader } from '@/shared/worker-panel/identity-header';
import { AccountBadge } from '@/entrypoints/popup/account-badge';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
import { openFullPanel } from '@/entrypoints/popup/open-full-panel';

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
          <button
            type="button"
            onClick={() => browser.runtime.openOptionsPage()}
            aria-label={browser.i18n.getMessage('sidepanelOpenSettings')}
            title={browser.i18n.getMessage('sidepanelOpenSettings')}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <GearIcon />
          </button>
          <button
            type="button"
            onClick={() => void openFullPanel(hostname)}
            aria-label={browser.i18n.getMessage('popupOpenFullPanel')}
            title={browser.i18n.getMessage('popupOpenFullPanel')}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      {tokens && tokens.length > 1 && accountToken && <AccountBadge resolvedToken={accountToken} />}

      {tokens && tokens.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-neutral-900">
            {browser.i18n.getMessage('sidepanelTokenMissingTitle')}
          </p>
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('sidepanelTokenMissingBody')}
          </p>
          <button
            type="button"
            onClick={() => browser.runtime.openOptionsPage()}
            className="rounded bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            {browser.i18n.getMessage('sidepanelOpenSettings')}
          </button>
        </div>
      )}

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
                version={version}
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
          </div>
        )}
    </main>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.96Z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3 14 10" />
      <path d="M3 21l7-7" />
    </svg>
  );
}
