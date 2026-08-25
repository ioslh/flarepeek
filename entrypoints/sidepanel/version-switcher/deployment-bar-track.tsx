import { useEffect, useRef, useState } from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import {
  formatPercentage,
  snapPercentage,
} from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';
import { cn } from '@/shared/ui/utils';

const TRACK_HEIGHT_PX = 64; // h-16

// Clears the wave band (WAVE_BAND_PX wide, centred on the boundary) so an
// escaped label never sits on top of the ripple.
const LABEL_ESCAPE_GAP_PX = 8;

// Whether a label fits inside its own field is decided in pixels, against
// the track's measured width, rather than by a hand-tuned percentage
// threshold — a fixed percentage silently becomes wrong as soon as the font
// size or the panel width changes.
//
// The label's own width is estimated from its characters rather than
// measured: measuring would need a render-then-remeasure pass for a value
// that changes on every drag frame. These advances are for the condensed
// sans at LABEL_FONT_SIZE_PX, rounded up slightly, and LABEL_FIT_PADDING_PX
// keeps the text from touching its field's edges.
const LABEL_FONT_SIZE_PX = 24; // text-2xl
const LABEL_DIGIT_ADVANCE_EM = 0.45;
const LABEL_PERCENT_ADVANCE_EM = 0.55;
const LABEL_DOT_ADVANCE_EM = 0.25;
const LABEL_FIT_PADDING_PX = 6;

// Used only for the first frame, before the ResizeObserver has reported a
// width. Deliberately on the conservative side of what the pixel rule works
// out to at a typical panel width: erring high means a borderline label
// starts as a chip and settles inside, rather than starting overflowed.
const LABEL_FIT_FALLBACK_PERCENT = 18;

function estimateLabelWidthPx(text: string): number {
  let em = 0;
  for (const character of text) {
    if (character === '%') em += LABEL_PERCENT_ADVANCE_EM;
    else if (character === '.') em += LABEL_DOT_ADVANCE_EM;
    else em += LABEL_DIGIT_ADVANCE_EM;
  }
  return em * LABEL_FONT_SIZE_PX;
}

// The boundary between the two traffic fields is a rippling edge rather than
// a straight seam. Crucially this is the *actual* colour division, not a
// squiggle drawn over a straight one: a narrow band centred on the boundary
// repaints itself with two filled shapes that share the wave as their common
// edge, so everything left of the wave is slot A's colour and everything
// right of it is slot B's.
const WAVE_BAND_PX = 12; // wide enough to contain the ripple with margin
const WAVE_TILE_PX = 96; // must match the translate in flarepeek-boundary-flow
const WAVE_SAMPLE_PX = 2;

// Three sine components summed together, so the edge looks irregular instead
// of like a textbook sine. Each one's `cycles` is a whole number of periods
// per tile, which is what keeps the *sum* exactly periodic over WAVE_TILE_PX
// — that's what lets the animation translate by one tile and loop with no
// visible seam. Using real randomness here would break that (and would also
// reshuffle the wave on every re-render).
const WAVE_COMPONENTS = [
  { cycles: 3, amplitude: 1.15, phase: 0 },
  { cycles: 5, amplitude: 0.7, phase: 1.3 },
  { cycles: 7, amplitude: 0.45, phase: 2.6 },
];

function waveOffsetAt(y: number): number {
  return WAVE_COMPONENTS.reduce(
    (sum, component) =>
      sum +
      component.amplitude *
        Math.sin((2 * Math.PI * component.cycles * y) / WAVE_TILE_PX + component.phase),
    0,
  );
}

// Two closed shapes meeting along the wave. The path runs from one tile
// above the track down to its bottom, so that at any point in the
// translate-by-one-tile animation the band is still fully covered.
function buildWaveFills(): { left: string; right: string } {
  const centerX = WAVE_BAND_PX / 2;
  const startY = -WAVE_TILE_PX;
  const endY = TRACK_HEIGHT_PX;

  const points: string[] = [];
  for (let y = startY; y <= endY; y += WAVE_SAMPLE_PX) {
    points.push(`${(centerX + waveOffsetAt(y)).toFixed(2)} ${y}`);
  }
  const edge = points.join(' L ');

  return {
    left: `M 0 ${startY} L ${edge} L 0 ${endY} Z`,
    right: `M ${WAVE_BAND_PX} ${startY} L ${edge} L ${WAVE_BAND_PX} ${endY} Z`,
  };
}

const WAVE_FILLS = buildWaveFills();

interface FieldLabelProps {
  percent: number;
  // Where the two fields meet, as a percentage from the left.
  boundaryPercent: number;
  side: 'left' | 'right';
  // null until the track has been measured (first frame only).
  trackWidthPx: number | null;
}

// A field's own traffic percentage, drawn on the bar itself.
//
// When the field is wide enough the label sits centred inside it. When it
// isn't — a 1% canary is a few pixels wide — the label escapes across the
// boundary onto the wide field instead of being clipped or hidden, and wears
// its own field's colour as a chip so it's still obvious which side it
// belongs to. (Plain coloured text on the opposite field was the other
// option, but orange-on-dark-grey doesn't clear a comfortable contrast
// ratio, and two same-coloured numbers would be ambiguous.)
function FieldLabel({ percent, boundaryPercent, side, trackWidthPx }: FieldLabelProps) {
  const text = `${formatPercentage(percent)}%`;
  const labelWidthPx = estimateLabelWidthPx(text);

  const fitsInside =
    trackWidthPx === null
      ? percent >= LABEL_FIT_FALLBACK_PERCENT
      : (percent / 100) * trackWidthPx >= labelWidthPx + LABEL_FIT_PADDING_PX * 2;

  if (fitsInside) {
    const rawCenter = side === 'left' ? percent / 2 : boundaryPercent + percent / 2;
    // A field barely wider than its label would otherwise push the text
    // against the end of the track; keeping the centre at least half a
    // label away from each edge is a no-op for any comfortable split.
    const halfLabelPercent =
      trackWidthPx === null ? 0 : ((labelWidthPx / 2 + LABEL_FIT_PADDING_PX) / trackWidthPx) * 100;
    const center = Math.min(Math.max(rawCenter, halfLabelPercent), 100 - halfLabelPercent);
    return (
      <span
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-stretch-extra-condensed font-sans text-2xl tracking-tight text-white/95 tabular-nums drop-shadow-sm"
        style={{ left: `${center}%` }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm px-1.5 py-0.5 font-stretch-extra-condensed font-sans text-base tracking-tight text-white tabular-nums',
        side === 'left' ? 'bg-neutral-700' : 'bg-primary',
      )}
      style={
        side === 'left'
          ? { left: `calc(${boundaryPercent}% + ${LABEL_ESCAPE_GAP_PX}px)` }
          : { right: `calc(${100 - boundaryPercent}% + ${LABEL_ESCAPE_GAP_PX}px)` }
      }
    >
      {text}
    </span>
  );
}

interface TrackInnerProps {
  percentA: number;
  percentB: number | null;
  // View mode draws its own boundary line; edit mode leaves that to the
  // Radix slider thumb so there aren't two markers on the same spot.
  showBoundaryLine: boolean;
  trackWidthPx: number | null;
}

// The track proper: two flat color fields, a ruler etched over them, and the
// boundary between them.
//
// Colors carry the story rather than decorating it — slot A is neutral (the
// incumbent) and slot B is the brand orange (what's being rolled out), so
// the orange field visibly growing *is* the rollout progressing, and a
// completed rollout leaves the bar entirely orange. The previous emerald /
// orange pairing implied "good vs warning", which is the wrong reading for
// two versions that differ only in age. Flat fills, no gradients: gradients
// here encoded nothing.
function TrackInner({ percentA, percentB, showBoundaryLine, trackWidthPx }: TrackInnerProps) {
  const hasSlotB = percentB !== null;

  return (
    <>
      <div className="absolute inset-0 flex overflow-hidden rounded-sm">
        <div
          className="h-full bg-neutral-700 transition-[width] duration-150 ease-out"
          style={{ width: `${percentA}%` }}
        />
        {hasSlotB && (
          <div
            className={cn(
              'h-full transition-[width] duration-150 ease-out',
              // A version sitting at 0% is still *in* the deployment (still
              // pinnable), so it keeps a hairline of presence rather than
              // vanishing, hatched to read as "present but taking nothing".
              percentB === 0
                ? 'min-w-[3px] bg-[repeating-linear-gradient(135deg,var(--primary)_0,var(--primary)_3px,transparent_3px,transparent_6px)]'
                : 'bg-primary',
            )}
            style={{ width: `${percentB}%` }}
          />
        )}
      </div>

      {/* The ruler. This is what turns a progress bar into an instrument:
          the x-axis isn't just "how much" but the hash space itself, evenly
          divided, with the boundary landing somewhere along it. Drawn as
          repeating gradients rather than dozens of DOM nodes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-sm"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255,255,255,0.18) 0 1px, transparent 1px 5%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-2.5 rounded-t-sm"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255,255,255,0.32) 0 1px, transparent 1px 10%)',
        }}
      />

      {/* Skipped at the extremes: with the boundary sitting on the track's
          own edge, half the band would be clipped away and the surviving
          half would paint the wrong field over the end of the bar. */}
      {showBoundaryLine && hasSlotB && percentB > 0 && percentB < 100 && (
        <svg
          aria-hidden="true"
          width={WAVE_BAND_PX}
          height={TRACK_HEIGHT_PX}
          viewBox={`0 0 ${WAVE_BAND_PX} ${TRACK_HEIGHT_PX}`}
          className="pointer-events-none absolute top-0 -translate-x-1/2 overflow-hidden"
          style={{ left: `${percentA}%` }}
        >
          {/* Both halves animate as one group so the shared edge stays a
              single continuous line, with no seam between the two fills. */}
          <g className="motion-safe:animate-[flarepeek-boundary-flow_14s_linear_infinite]">
            <path d={WAVE_FILLS.left} className="fill-neutral-700" />
            <path d={WAVE_FILLS.right} className="fill-primary" />
          </g>
        </svg>
      )}

      {/* Last, so labels sit above both the fields and the wave band. Slot A
          always gets one — including the single-version case, where it reads
          "100%" across the whole bar. That used to be suppressed as
          redundant, back when VersionSlot printed the percentage too; with
          that gone, the bar is the only place the number appears at all. */}
      <FieldLabel
        percent={percentA}
        boundaryPercent={percentA}
        side="left"
        trackWidthPx={trackWidthPx}
      />
      {hasSlotB && (
        <FieldLabel
          percent={percentB}
          boundaryPercent={percentA}
          side="right"
          trackWidthPx={trackWidthPx}
        />
      )}
    </>
  );
}

interface DeploymentBarTrackProps {
  // Percentage held by slot B (the right/orange side). null means there is
  // no slot B at all — a single-version deployment, or edit mode before a
  // second version has been picked — and the track renders as one full
  // field with no boundary and no drag handle.
  percentageB: number | null;
  // Slot B's percentage in each earlier deployment of this rollout, newest
  // first (see shared/cloudflare-api/deployments.ts). Drawn as faint marks
  // above the track.
  boundaryTrail?: number[];
  editable: boolean;
  disabled?: boolean;
  onChangePercentageB?: (value: number) => void;
}

export function DeploymentBarTrack({
  percentageB,
  boundaryTrail = [],
  editable,
  disabled,
  onChangePercentageB,
}: DeploymentBarTrackProps) {
  const hasSlotB = percentageB !== null;
  const percentA = hasSlotB ? 100 - percentageB : 100;
  const isEditable = editable && hasSlotB;
  // While dragging, the trail would read as "where you've dragged past",
  // which it isn't — it's deployment history, so it only shows at rest.
  const showTrail = !editable && boundaryTrail.length > 0;

  // Measured so the labels can decide in pixels whether they fit, and so
  // that decision keeps holding when the user resizes the side panel.
  // Observed on the wrapper, whose width matches the track's in both modes.
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackWidthPx, setTrackWidthPx] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setTrackWidthPx(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {/* Past boundary positions of this rollout, fading with age — the
          Worker's rollout trajectory, readable at a glance. Thin ticks
          rather than arrows so they share the ruler's vocabulary. */}
      <div aria-hidden="true" className={cn('relative h-2', !showTrail && 'hidden')}>
        {boundaryTrail.map((pastPercentB, index) => (
          <span
            key={`${pastPercentB}-${index}`}
            className="absolute bottom-0 h-2 w-px bg-neutral-400"
            style={{
              left: `${100 - pastPercentB}%`,
              opacity: Math.max(0.15, 0.6 - index * 0.15),
            }}
          />
        ))}
      </div>

      {isEditable ? (
        <SliderPrimitive.Root
          className="relative flex h-16 w-full touch-none items-center rounded-sm bg-neutral-200 select-none data-[disabled]:opacity-50"
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
          <TrackInner
            percentA={percentA}
            percentB={percentageB}
            showBoundaryLine={false}
            trackWidthPx={trackWidthPx}
          />
          <SliderPrimitive.Track className="relative h-full w-full">
            <SliderPrimitive.Range className="hidden" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className="block h-18 w-1 shrink-0 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] ring-ring/50 transition-shadow hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
            aria-label={browser.i18n.getMessage('deploymentBarHandleLabel')}
          />
        </SliderPrimitive.Root>
      ) : (
        // overflow-hidden so the wave, which is wider than the line it
        // replaces, clips cleanly at 0%/100% instead of hanging off the
        // track. Only safe in view mode — edit mode's slider thumb is taller
        // than the track and must be allowed to overflow.
        <div className="relative h-16 w-full overflow-hidden rounded-sm bg-neutral-200">
          <TrackInner
            percentA={percentA}
            percentB={hasSlotB ? percentageB : null}
            showBoundaryLine
            trackWidthPx={trackWidthPx}
          />
        </div>
      )}

      {/* No caption row here any more: the percentages live on the bar
          itself now (see FieldLabel), which is where they were always
          wanted — the caption only existed because in-field labels used to
          vanish on narrow fields. */}
    </div>
  );
}
