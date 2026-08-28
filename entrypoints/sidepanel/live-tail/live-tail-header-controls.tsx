import { Pause, Play, Square, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { UseLiveTailResult } from '@/entrypoints/sidepanel/live-tail/use-live-tail';

interface LiveTailHeaderControlsProps {
  tail: UseLiveTailResult;
  onClose: () => void;
}

// Replaces "Adjust traffic / deploy" in the deployment section's header
// while the Live Tail view is open — see deployment-bar.tsx. Pause/Stop only
// make sense once there's actually a connection, so which buttons render
// tracks the state machine in use-live-tail.ts rather than always showing
// all three.
export function LiveTailHeaderControls({ tail, onClose }: LiveTailHeaderControlsProps) {
  const { state } = tail;

  return (
    <div className="flex items-center gap-1.5">
      {state.status === 'starting' && (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled>
          {browser.i18n.getMessage('liveTailConnecting')}
        </Button>
      )}

      {state.status === 'streaming' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={tail.togglePause}
        >
          {state.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {browser.i18n.getMessage(state.paused ? 'liveTailResume' : 'liveTailPause')}
        </Button>
      )}

      {state.status === 'stopping' && (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled>
          {browser.i18n.getMessage('liveTailStopping')}
        </Button>
      )}

      {(state.status === 'ended' || state.status === 'error') && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={tail.start}
        >
          {browser.i18n.getMessage('liveTailRestart')}
        </Button>
      )}

      {(state.status === 'starting' || state.status === 'streaming') && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={tail.stop}
        >
          <Square className="size-3.5" />
          {browser.i18n.getMessage('liveTailStop')}
        </Button>
      )}

      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
        <X className="size-3.5" />
        {browser.i18n.getMessage('liveTailClose')}
      </Button>
    </div>
  );
}
