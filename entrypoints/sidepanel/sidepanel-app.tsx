import { useState } from 'react';
import { useTokens } from '@/shared/storage/use-tokens';
import { usePinnedHostname } from '@/entrypoints/sidepanel/use-pinned-hostname';
import { TabChangedBanner } from '@/entrypoints/sidepanel/tab-changed-banner';
import { RefreshButton } from '@/entrypoints/sidepanel/refresh-button';
import { AccountControl } from '@/entrypoints/sidepanel/account/account-control';
import { VersionSwitcher } from '@/entrypoints/sidepanel/version-switcher/version-switcher';
import { useWorkerLookup, clearWorkerLookupCache } from '@/shared/worker-panel/use-worker-lookup';
import { IdentityHeader } from '@/shared/worker-panel/identity-header';

export function SidepanelApp() {
  const tokens = useTokens();
  const pin = usePinnedHostname();
  const [forcedTokenId, setForcedTokenId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const lookup = useWorkerLookup(pin.hostname, tokens, forcedTokenId, refreshKey);
  // Best-guess account label before the lookup resolves — see the identical
  // comment in popup-app.tsx.
  const resolvedToken = lookup.status === 'ready' ? lookup.resolved.token : (tokens?.[0] ?? null);

  const refresh = () => {
    if (pin.hostname) clearWorkerLookupCache(pin.hostname);
    setRefreshKey((key) => key + 1);
  };

  return (
    <main className="flex min-h-screen w-full flex-col gap-3 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-2">
        {pin.hostname ? (
          <IdentityHeader
            hostname={pin.hostname}
            worker={lookup.status === 'ready' ? lookup.resolved.worker : null}
          />
        ) : (
          <h1 className="text-sm font-semibold text-neutral-900">
            {browser.i18n.getMessage('sidepanelHeading')}
          </h1>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <RefreshButton onClick={refresh} />
          <AccountControl
            tokens={tokens ?? []}
            forcedTokenId={forcedTokenId}
            resolvedToken={resolvedToken}
            onSelect={setForcedTokenId}
          />
        </div>
      </div>

      {pin.isStale && pin.liveHostname && (
        <TabChangedBanner liveHostname={pin.liveHostname} onSwitch={pin.switchToLive} />
      )}

      {tokens && tokens.length === 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-sm font-medium text-neutral-900">
            {browser.i18n.getMessage('sidepanelTokenMissingTitle')}
          </p>
          <p className="text-sm text-neutral-500">
            {browser.i18n.getMessage('sidepanelTokenMissingBody')}
          </p>
          <button
            type="button"
            onClick={() => browser.runtime.openOptionsPage()}
            className="self-start rounded bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            {browser.i18n.getMessage('sidepanelOpenSettings')}
          </button>
        </div>
      )}

      {tokens && tokens.length > 0 && (
        <VersionSwitcher
          lookup={lookup}
          hostname={pin.hostname}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </main>
  );
}
