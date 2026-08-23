import { Slider as SliderPrimitive } from 'radix-ui';
import {
  formatPercentage,
  snapPercentage,
} from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';
import { cn } from '@/shared/ui/utils';

// Below this width a segment's own percentage label would overflow/collide
// with its neighbor, so it's only drawn once there's room.
const LABEL_MIN_PERCENT = 14;

interface SegmentsProps {
  percentA: number;
  percentB: number | null;
}

function Segments({ percentA, percentB }: SegmentsProps) {
  return (
    <div className="absolute inset-0 flex overflow-hidden rounded-md">
      <div
        className="flex h-full items-center justify-center bg-gradient-to-b from-emerald-500 to-emerald-700 transition-[width] duration-150 ease-out"
        style={{ width: `${percentA}%` }}
      >
        {percentA >= LABEL_MIN_PERCENT && (
          <span className="font-mono text-xs font-semibold text-white/95 drop-shadow-sm">
            {formatPercentage(percentA)}%
          </span>
        )}
      </div>
      {percentB !== null && (
        <div
          className={cn(
            'flex h-full items-center justify-center transition-[width] duration-150 ease-out',
            percentB === 0
              ? 'min-w-[5px] bg-[repeating-linear-gradient(135deg,var(--primary)_0,var(--primary)_4px,transparent_4px,transparent_8px)]'
              : 'bg-gradient-to-b from-primary to-orange-700',
          )}
          style={{ width: `${percentB}%` }}
        >
          {percentB >= LABEL_MIN_PERCENT && (
            <span className="font-mono text-xs font-semibold text-white/95 drop-shadow-sm">
              {formatPercentage(percentB)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface DeploymentBarTrackProps {
  // Percentage held by slot B (the right/orange side). null means there is
  // no slot B at all — a single-version deployment, or edit mode before a
  // second version has been picked — and the track renders as one full
  // segment with no drag handle.
  percentageB: number | null;
  editable: boolean;
  disabled?: boolean;
  onChangePercentageB?: (value: number) => void;
}

export function DeploymentBarTrack({
  percentageB,
  editable,
  disabled,
  onChangePercentageB,
}: DeploymentBarTrackProps) {
  const hasSlotB = percentageB !== null;
  const percentA = hasSlotB ? 100 - percentageB : 100;

  if (!editable || !hasSlotB) {
    return (
      <div className="relative h-9 w-full rounded-md bg-neutral-900">
        <Segments percentA={percentA} percentB={hasSlotB ? percentageB : null} />
      </div>
    );
  }

  return (
    <SliderPrimitive.Root
      className="relative flex h-9 w-full touch-none items-center rounded-md bg-neutral-900 select-none data-[disabled]:opacity-50"
      value={[percentA]}
      min={0}
      max={100}
      step={1}
      disabled={disabled}
      onValueChange={([raw]) => {
        if (raw === undefined) return;
        onChangePercentageB?.(100 - snapPercentage(raw));
      }}
    >
      <Segments percentA={percentA} percentB={percentageB} />
      <SliderPrimitive.Track className="relative h-full w-full">
        <SliderPrimitive.Range className="hidden" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-[46px] w-3.5 shrink-0 rounded-sm border border-white/40 bg-white shadow-md ring-ring/50 transition-shadow hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
        aria-label={browser.i18n.getMessage('deploymentBarHandleLabel')}
      />
    </SliderPrimitive.Root>
  );
}
