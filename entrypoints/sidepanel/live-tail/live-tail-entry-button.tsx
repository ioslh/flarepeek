import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/utils';
import type { UseLiveTailResult } from '@/entrypoints/sidepanel/live-tail/use-live-tail';

interface LiveTailEntryButtonProps {
  tail: UseLiveTailResult;
  onOpen: () => void;
}

// Sits next to "Adjust traffic / deploy" in the deployment section's header.
// If a session is already running in the background (the view was closed
// without hitting Stop — see use-live-tail.ts), clicking this just reopens
// the view onto that same session instead of starting a new one. The dot
// mirrors the dynamic tab's own "following" marker (see
// docs/sidepanel-tabs-design.md) — same visual vocabulary for "this is live"
// everywhere in the panel.
export function LiveTailEntryButton({ tail, onOpen }: LiveTailEntryButtonProps) {
  const isRunning = tail.state.status === 'starting' || tail.state.status === 'streaming';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 text-xs"
      title={isRunning ? browser.i18n.getMessage('liveTailRunningInBackground') : undefined}
      onClick={() => {
        if (!isRunning) tail.start();
        onOpen();
      }}
    >
      {isRunning && (
        <span
          className={cn(
            'size-1.5 rounded-full bg-destructive',
            tail.state.status === 'streaming' && 'animate-pulse',
          )}
        />
      )}
      {browser.i18n.getMessage('liveTailHeading')}
    </Button>
  );
}
