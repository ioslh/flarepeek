import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/ui/utils';

const HOLD_DURATION_MS = 1500;

interface HoldToConfirmButtonProps {
  label: string;
  // Announced to assistive tech in place of the visual label, which only
  // describes the gesture ("hold to deploy") and not the outcome.
  ariaLabel: string;
  disabled?: boolean;
  // Retreating flips the button to the destructive palette: rolling back
  // moves exactly as many users as advancing did, and shouldn't look safer.
  danger?: boolean;
  onConfirm: () => void;
}

// Deploying changes live production traffic, so it takes a deliberate,
// sustained gesture rather than a click. This replaces the old
// click → modal → click-again flow outright: stacking a hold on top of a
// confirmation dialog would be three gates for one decision, and the hold
// is already impossible to trigger by accident.
//
// Pointer and keyboard both drive it. A hold-only control would lock out
// keyboard users entirely, so Space/Enter held down does the same thing,
// and releasing either input cancels.
export function HoldToConfirmButton({
  label,
  ariaLabel,
  disabled,
  danger,
  onConfirm,
}: HoldToConfirmButtonProps) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };

  const start = () => {
    if (disabled || timerRef.current !== null) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_DURATION_MS);
  };

  // A pending hold must not outlive the button — unmounting mid-hold
  // (switching tabs, a refresh landing) would otherwise still fire a deploy.
  useEffect(() => cancel, []);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if (event.repeat) return;
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') cancel();
      }}
      onBlur={cancel}
      className={cn(
        'relative flex-1 touch-none overflow-hidden rounded-md px-3 py-2 text-sm font-medium select-none',
        'transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'bg-destructive text-white hover:bg-destructive/90'
          : 'bg-foreground text-background hover:bg-foreground/90',
      )}
    >
      {/* The progress fill is functional feedback rather than decoration —
          without it the hold has no visible duration — so it is not gated
          behind prefers-reduced-motion. */}
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 left-0 bg-white/25', holding ? 'w-full' : 'w-0')}
        style={{
          transition: holding ? `width ${HOLD_DURATION_MS}ms linear` : 'width 120ms ease-out',
        }}
      />
      <span className="relative">{label}</span>
    </button>
  );
}
