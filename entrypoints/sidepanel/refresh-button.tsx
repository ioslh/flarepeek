import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

interface RefreshButtonProps {
  onClick: () => void;
}

// Manually bypasses the worker-lookup cache (see
// shared/worker-panel/use-worker-lookup.ts) for the pinned hostname — the
// panel otherwise never refetches an already-resolved worker on its own.
export function RefreshButton({ onClick }: RefreshButtonProps) {
  const label = browser.i18n.getMessage('refreshButtonLabel');

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
