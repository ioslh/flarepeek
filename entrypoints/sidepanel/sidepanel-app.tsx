import { useTokens } from '@/shared/storage/use-tokens';
import { AccountControl } from '@/entrypoints/sidepanel/account/account-control';
import { usePanelTabs } from '@/entrypoints/sidepanel/tabs/use-panel-tabs';
import { PanelTabStrip } from '@/entrypoints/sidepanel/tabs/panel-tab-strip';
import { PanelTabPane } from '@/entrypoints/sidepanel/tabs/panel-tab-pane';
import { NoTokenEmptyState } from '@/shared/worker-panel/no-token-empty-state';
import { useWorkerLookup } from '@/shared/worker-panel/use-worker-lookup';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { cn } from '@/shared/ui/utils';

export function SidepanelApp() {
  const tokens = useTokens();
  const panel = usePanelTabs(tokens);

  // Only for AccountControl's display — each PanelTabPane still resolves its
  // own worker independently (that's what makes the keep-alive mounting
  // cheap). A second call for the same hostname just hits
  // useWorkerLookup's module-level cache once the first one has resolved;
  // the only cost is a duplicate multi-token trial the very first time a
  // given hostname is ever seen this session, which is harmless. No
  // refreshKey — account resolution rarely changes, and the actual Worker
  // data refresh stays each pane's own concern.
  const headerLookup = useWorkerLookup(panel.activeHostname, tokens, panel.activeForcedTokenId);
  const headerResolvedToken =
    headerLookup.status === 'ready' ? headerLookup.resolved.token : (tokens?.[0] ?? null);

  if (!tokens) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <main className="flex min-h-screen w-full flex-col gap-3 bg-neutral-50 p-4">
        {tokens.length === 0 && <NoTokenEmptyState />}

        {tokens.length > 0 && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <PanelTabStrip
                pinnedTabs={panel.pinnedTabs}
                dynamicHostname={panel.dynamicHostname}
                activeHostname={panel.activeHostname}
                isActiveDynamic={panel.isActiveDynamic}
                onSelectPinned={panel.selectPinnedTab}
                onSelectDynamic={panel.focusDynamicTab}
                onUnpin={panel.unpin}
                onPinDynamic={panel.pinCurrentDynamic}
                onAddManual={panel.addManualTab}
              />
              <AccountControl
                tokens={tokens}
                forcedTokenId={panel.activeForcedTokenId}
                resolvedToken={headerResolvedToken}
                onSelect={panel.setActiveForcedTokenId}
              />
            </div>

            {/* Every pinned tab that's ever been viewed this session stays
                mounted (hidden, not unmounted) so switching back to it is
                instant and doesn't re-fetch — see use-panel-tabs.ts. */}
            {panel.mountedHostnames.map((hostname) => (
              <PanelTabPane
                key={hostname}
                hostname={hostname}
                tokens={tokens}
                forcedTokenId={
                  panel.pinnedTabs.find((tab) => tab.hostname === hostname)?.forcedTokenId ?? null
                }
                isDynamic={false}
                className={cn(
                  (panel.isActiveDynamic || panel.activeHostname !== hostname) && 'hidden',
                )}
              />
            ))}

            {/* The dynamic pane never stays mounted across a host change —
                it's rendered fresh only while it's the active tab. */}
            {panel.isActiveDynamic && panel.dynamicHostname && (
              <PanelTabPane
                key={panel.dynamicHostname}
                hostname={panel.dynamicHostname}
                tokens={tokens}
                forcedTokenId={panel.activeForcedTokenId}
                isDynamic
              />
            )}
          </>
        )}
      </main>
    </TooltipProvider>
  );
}
