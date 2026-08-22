import { setSidepanelHandoff } from '@/shared/worker-panel/sidepanel-handoff';

// Must be called directly from a click handler — chrome.sidePanel.open()
// requires an active user gesture, same constraint as
// chrome.permissions.request() (see shared/version-override/version-override.ts).
export async function openFullPanel(hostname: string | null | undefined): Promise<void> {
  if (hostname) await setSidepanelHandoff(hostname);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId === undefined) return;

  await chrome.sidePanel.open({ windowId: tab.windowId });
}
