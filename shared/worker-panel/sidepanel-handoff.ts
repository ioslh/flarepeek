import { storage } from 'wxt/utils/storage';

// One-shot handoff from the popup's "open full panel" button to the side
// panel: the popup writes the hostname to pin to right before calling
// chrome.sidePanel.open(); the side panel reads + clears it once on init
// (see entrypoints/popup/open-full-panel.ts and
// entrypoints/sidepanel/use-pinned-hostname.ts). Session-scoped — it's only
// ever meant to survive that single handoff, not a browser restart.
const handoffItem = storage.defineItem<string | null>('session:pinnedHostnameHandoff', {
  fallback: null,
});

export async function setSidepanelHandoff(hostname: string): Promise<void> {
  await handoffItem.setValue(hostname);
}

export async function consumeSidepanelHandoff(): Promise<string | null> {
  const value = await handoffItem.getValue();
  if (value !== null) await handoffItem.removeValue();
  return value;
}
