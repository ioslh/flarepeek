import { initTabBadgeOrchestrator } from '@/entrypoints/background/tab-badge/tab-badge-orchestrator';

export default defineBackground(() => {
  // openPanelOnActionClick is a persisted, per-extension Chrome preference —
  // it survives reloads and isn't reset just because the code that once set
  // it true is gone. This was set true in an earlier iteration (side panel
  // as the only surface); now that the popup is back as the toolbar icon's
  // target, this has to explicitly set it back to false or Chrome keeps
  // opening the side panel on icon click regardless of action.default_popup.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

  initTabBadgeOrchestrator();
});
