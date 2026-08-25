import { Radar } from 'lucide-react';
import { setManualDetectionEnabled } from '@/shared/storage/detection-mode-storage';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Switch } from '@/shared/ui/switch';

interface DetectionModeToggleProps {
  enabled: boolean;
}

// Only rendered on the pane currently showing the dynamic tab's content —
// see entrypoints/sidepanel/tabs/panel-tab-pane.tsx. Deliberately a small,
// low-key icon (not a labeled button) — this is a setting for people who
// care about it, not something that should compete for attention with the
// pin/refresh/account controls next to it. The popover exists specifically
// to explain *why* this setting exists before the user flips it, not just
// expose a bare switch.
export function DetectionModeToggle({ enabled }: DetectionModeToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={browser.i18n.getMessage('detectionModeToggleTooltip')}
          title={browser.i18n.getMessage('detectionModeToggleTooltip')}
        >
          <Radar className="size-4" />
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
            checked={enabled}
            onCheckedChange={(checked) => void setManualDetectionEnabled(checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
