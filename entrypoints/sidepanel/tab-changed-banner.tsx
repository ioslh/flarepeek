interface TabChangedBannerProps {
  liveHostname: string;
  onSwitch: () => void;
}

// Shown when the browser's actual active tab has moved on from whatever the
// panel is pinned to — a nudge, not an interruption, so the user isn't
// yanked away from what they're looking at just because they clicked around.
export function TabChangedBanner({ liveHostname, onSwitch }: TabChangedBannerProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
      <span className="truncate text-orange-800">
        {browser.i18n.getMessage('tabChangedBannerLabel', liveHostname)}
      </span>
      <button
        type="button"
        onClick={onSwitch}
        className="shrink-0 rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700"
      >
        {browser.i18n.getMessage('tabChangedBannerButton')}
      </button>
    </div>
  );
}
