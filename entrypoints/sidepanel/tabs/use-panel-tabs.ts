import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveActiveTab } from '@/entrypoints/sidepanel/tabs/panel-tabs-state';
import { usePinnedTabs } from '@/entrypoints/sidepanel/tabs/use-pinned-tabs';
import { useLiveTabHostname } from '@/shared/worker-panel/use-live-tab-hostname';
import { queryLiveTabHostname } from '@/shared/worker-panel/live-tab-hostname';
import { consumeSidepanelHandoff } from '@/shared/worker-panel/sidepanel-handoff';
import {
  addPinnedTab,
  removePinnedTab,
  setPinnedTabForcedToken,
} from '@/shared/storage/pinned-tabs-storage';
import type { PinnedTab } from '@/shared/storage/pinned-tabs-storage';
import type { StoredToken } from '@/shared/storage/token-storage';

export interface PanelTabs {
  // [] while still loading — same "just render nothing extra yet" contract
  // as tokens elsewhere; there's no meaningful distinction to draw between
  // "loading" and "genuinely zero pinned tabs" for a fresh install.
  pinnedTabs: PinnedTab[];
  // Mirrors useLiveTabHostname: undefined = still resolving, null = no
  // active http(s) tab.
  dynamicHostname: string | null | undefined;
  activeHostname: string | null | undefined;
  isActiveDynamic: boolean;
  // Which pinned hostnames have been viewed at least once this session and
  // should therefore stay mounted (hidden, not unmounted) when not active —
  // see docs/sidepanel-tabs-design.md's lazy-mount / keep-alive rule.
  mountedHostnames: string[];
  selectPinnedTab: (hostname: string) => void;
  focusDynamicTab: () => void;
  pinCurrentDynamic: () => void;
  unpin: (hostname: string) => void;
  addManualTab: (hostname: string) => void;
  // Which token the *currently active* tab is locked to — sourced from
  // PinnedTab.forcedTokenId for a pinned tab (persisted), or from an
  // ephemeral local value for the dynamic tab (see dynamicForcedTokenId
  // below). This is what the header's AccountControl reads/writes now that
  // it's hoisted out of PanelTabPane — see entrypoints/sidepanel/sidepanel-app.tsx.
  activeForcedTokenId: string | null;
  setActiveForcedTokenId: (tokenId: string | null) => void;
}

// Replaces entrypoints/sidepanel/use-pinned-hostname.ts. Composes the
// pinned-tab list (persisted) with the live browser tab (ephemeral) into
// one "which hostname is the panel showing right now" model — see
// docs/sidepanel-tabs-design.md for the full interaction design.
export function usePanelTabs(tokens: StoredToken[] | undefined): PanelTabs {
  const pinnedTabs = usePinnedTabs();
  const dynamicHostname = useLiveTabHostname();
  const pinnedHostnames = useMemo(() => (pinnedTabs ?? []).map((t) => t.hostname), [pinnedTabs]);

  // undefined = still doing the one-shot cold-start init below.
  const [activeHostname, setActiveHostname] = useState<string | null | undefined>(undefined);
  const [isActiveDynamic, setIsActiveDynamic] = useState(true);
  const [mountedHostnames, setMountedHostnames] = useState<Set<string>>(new Set());
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    (async () => {
      const handoff = await consumeSidepanelHandoff();
      // Always initialize as "dynamic, pointing at this host" — if it turns
      // out to already be pinned, the reconciliation effect below flips it
      // to isActiveDynamic: false itself once pinnedTabs finishes loading,
      // the same way it would for any later browser-tab switch. No need to
      // duplicate that check here.
      setActiveHostname(handoff !== null ? handoff : await queryLiveTabHostname());
    })();
  }, []);

  // Re-derive focus whenever the dynamic tab's content or the pinned list
  // changes — covers both a browser-tab switch and the pinned list finishing
  // its initial load after the init effect above already set an active host.
  useEffect(() => {
    if (activeHostname === undefined) return;

    const result = resolveActiveTab({
      pinnedHostnames,
      dynamicHostname: dynamicHostname ?? null,
      activeHostname,
      isActiveDynamic,
    });
    if (result.activeHostname !== activeHostname || result.isActiveDynamic !== isActiveDynamic) {
      setActiveHostname(result.activeHostname);
      setIsActiveDynamic(result.isActiveDynamic);
    }
  }, [pinnedHostnames, dynamicHostname, activeHostname, isActiveDynamic]);

  // The single write point for "first time viewing this pinned tab" — see
  // the lazy-mount rule.
  useEffect(() => {
    if (!activeHostname || isActiveDynamic) return;
    setMountedHostnames((prev) =>
      prev.has(activeHostname) ? prev : new Set(prev).add(activeHostname),
    );
  }, [activeHostname, isActiveDynamic]);

  // The dynamic tab's own token lock — ephemeral, unlike a pinned tab's
  // (which persists in PinnedTab.forcedTokenId). Reset whenever the
  // underlying host changes so a lock made for one site never silently
  // carries over to whatever the browser tab shows next.
  const [dynamicForcedTokenId, setDynamicForcedTokenId] = useState<string | null>(null);
  useEffect(() => {
    setDynamicForcedTokenId(null);
  }, [dynamicHostname]);

  // If a locked token (pinned or dynamic) no longer exists — removed in
  // Options — fall back to auto-detect rather than silently querying with a
  // token that's gone.
  useEffect(() => {
    if (!tokens) return;
    const validIds = new Set(tokens.map((token) => token.id));

    if (dynamicForcedTokenId && !validIds.has(dynamicForcedTokenId)) {
      setDynamicForcedTokenId(null);
    }
    for (const tab of pinnedTabs ?? []) {
      if (tab.forcedTokenId && !validIds.has(tab.forcedTokenId)) {
        void setPinnedTabForcedToken(tab.hostname, null);
      }
    }
  }, [tokens, pinnedTabs, dynamicForcedTokenId]);

  const activeForcedTokenId = isActiveDynamic
    ? dynamicForcedTokenId
    : ((pinnedTabs ?? []).find((tab) => tab.hostname === activeHostname)?.forcedTokenId ?? null);

  const setActiveForcedTokenId = useCallback(
    (tokenId: string | null) => {
      if (isActiveDynamic) {
        setDynamicForcedTokenId(tokenId);
      } else if (activeHostname) {
        void setPinnedTabForcedToken(activeHostname, tokenId);
      }
    },
    [isActiveDynamic, activeHostname],
  );

  const selectPinnedTab = useCallback((hostname: string) => {
    setIsActiveDynamic(false);
    setActiveHostname(hostname);
  }, []);

  const focusDynamicTab = useCallback(() => {
    setIsActiveDynamic(true);
    setActiveHostname(dynamicHostname ?? null);
  }, [dynamicHostname]);

  const pinCurrentDynamic = useCallback(() => {
    if (!dynamicHostname) return;
    void addPinnedTab(dynamicHostname);
    setIsActiveDynamic(false);
    setActiveHostname(dynamicHostname);
    setMountedHostnames((prev) =>
      prev.has(dynamicHostname) ? prev : new Set(prev).add(dynamicHostname),
    );
  }, [dynamicHostname]);

  const addManualTab = useCallback((hostname: string) => {
    void addPinnedTab(hostname);
    setIsActiveDynamic(false);
    setActiveHostname(hostname);
    setMountedHostnames((prev) => (prev.has(hostname) ? prev : new Set(prev).add(hostname)));
  }, []);

  const unpin = useCallback(
    (hostname: string) => {
      void removePinnedTab(hostname);
      setMountedHostnames((prev) => {
        if (!prev.has(hostname)) return prev;
        const next = new Set(prev);
        next.delete(hostname);
        return next;
      });

      const wasActive = !isActiveDynamic && activeHostname === hostname;
      if (!wasActive) return;

      const index = pinnedHostnames.indexOf(hostname);
      const neighbor = index > 0 ? pinnedHostnames[index - 1] : null;
      if (neighbor) {
        setIsActiveDynamic(false);
        setActiveHostname(neighbor);
      } else {
        setIsActiveDynamic(true);
        setActiveHostname(dynamicHostname ?? null);
      }
    },
    [isActiveDynamic, activeHostname, pinnedHostnames, dynamicHostname],
  );

  return {
    pinnedTabs: pinnedTabs ?? [],
    dynamicHostname,
    activeHostname,
    isActiveDynamic,
    mountedHostnames: Array.from(mountedHostnames),
    selectPinnedTab,
    focusDynamicTab,
    pinCurrentDynamic,
    unpin,
    addManualTab,
    activeForcedTokenId,
    setActiveForcedTokenId,
  };
}
