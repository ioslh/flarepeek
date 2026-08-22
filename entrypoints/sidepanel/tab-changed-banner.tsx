import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

interface TabChangedBannerProps {
  liveHostname: string;
  onSwitch: () => void;
}

// Shown when the browser's actual active tab has moved on from whatever the
// panel is pinned to — a nudge, not an interruption, so the user isn't
// yanked away from what they're looking at just because they clicked around.
export function TabChangedBanner({ liveHostname, onSwitch }: TabChangedBannerProps) {
  return (
    <Alert className="flex items-center justify-between gap-2 border-orange-200 bg-orange-50 py-2">
      <AlertDescription className="truncate text-orange-800">
        {browser.i18n.getMessage('tabChangedBannerLabel', liveHostname)}
      </AlertDescription>
      <Button size="sm" className="shrink-0" onClick={onSwitch}>
        {browser.i18n.getMessage('tabChangedBannerButton')}
      </Button>
    </Alert>
  );
}
