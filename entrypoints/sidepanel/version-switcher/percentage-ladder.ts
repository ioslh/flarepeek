// Quick-pick percentages shown as buttons under the bar in edit mode, and
// the step size the drag handle jumps by on ArrowLeft/ArrowRight.
export const PERCENTAGE_LADDER = [0, 1, 5, 10, 25, 40, 50, 75, 100];

// Snaps a raw drag position to a resolution that gets coarser as the value
// grows — fine-grained near 0 (where a canary's first percentage point
// matters a lot) and whole percentage points everywhere else. Ported from
// the demo's snap().
export function snapPercentage(raw: number): number {
  if (raw <= 0.02) return 0;
  if (raw >= 99.5) return 100;
  if (raw < 1) return Math.round(raw / 0.05) * 0.05;
  if (raw < 5) return Math.round(raw * 2) / 2;
  return Math.round(raw);
}

// Formats a percentage for display: whole numbers with no decimals, small
// fractional values trimmed of a trailing zero (e.g. 0.5, not 0.50).
export function formatPercentage(value: number): string {
  if (value === 0) return '0';
  if (value < 1) return value.toFixed(2).replace(/0$/, '');
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
