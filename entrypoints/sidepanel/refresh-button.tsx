import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

interface RefreshButtonProps {
  onClick: () => void;
  // Overrides the default "Refresh" label — the dynamic tab's manual-
  // detection mode reuses this same button as its "detect this site"
  // trigger before anything has loaded yet (see
  // entrypoints/sidepanel/tabs/panel-tab-pane.tsx), which needs different
  // wording than an actual refresh of already-loaded data.
  label?: string;
}

// Manually bypasses the worker-lookup cache (see
// shared/worker-panel/use-worker-lookup.ts) for the pinned hostname — the
// panel otherwise never refetches an already-resolved worker on its own.
export function RefreshButton({ onClick, label: labelOverride }: RefreshButtonProps) {
  const label = labelOverride ?? browser.i18n.getMessage('refreshButtonLabel');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick} aria-label={label}>
          <RefreshCw className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
