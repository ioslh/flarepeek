import { ChevronDown, RefreshCw } from 'lucide-react';
import { setManualDetectionEnabled } from '@/shared/storage/detection-mode-storage';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Switch } from '@/shared/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/ui/utils';

interface FetchControlProps {
  onRefresh: () => void;
  // Overrides the refresh label — in manual mode, before anything has
  // loaded, this same control is the "check this site" trigger.
  refreshLabel?: string;
  // Only the dynamic tab exposes the auto/manual policy: a pinned tab always
  // loads on first view. Without this the control is a plain refresh button.
  detection?: {
    manualEnabled: boolean;
  };
}

// Refresh and detection mode were two separate icons sitting side by side,
// but they are the same subject — *when does this tab fetch* — split into a
// one-off ("now") and a policy ("automatically, or only when I ask"). So
// they become one split control, borrowing the same grammar as the dashboard
// jump: the main half performs the action, the caret configures it.
export function FetchControl({ onRefresh, refreshLabel, detection }: FetchControlProps) {
  const label = refreshLabel ?? browser.i18n.getMessage('refreshButtonLabel');

  const refreshButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={label}
          className={cn('h-7 px-2', detection && 'rounded-r-none')}
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  if (!detection) return refreshButton;

  return (
    <div className="flex shrink-0">
      {refreshButton}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={browser.i18n.getMessage('detectionModeToggleTooltip')}
            className={cn(
              'h-7 rounded-l-none border-l-0 px-1.5',
              // The policy is worth noticing when it is *not* the default,
              // since manual mode is why a tab may sit there showing nothing.
              detection.manualEnabled && 'text-primary',
            )}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {browser.i18n.getMessage('detectionModePopoverTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {browser.i18n.getMessage('detectionModePopoverDescription')}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="manual-detection-switch" className="text-sm font-normal">
              {browser.i18n.getMessage('detectionModeSwitchLabel')}
            </Label>
            <Switch
              id="manual-detection-switch"
              checked={detection.manualEnabled}
              onCheckedChange={(checked) => void setManualDetectionEnabled(checked)}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
