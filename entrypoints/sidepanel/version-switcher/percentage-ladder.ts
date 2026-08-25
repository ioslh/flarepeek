// Quick-pick percentages shown as buttons under the bar in edit mode, and
// the step size the drag handle jumps by on ArrowLeft/ArrowRight.
//
// Descending on purpose: these set slot B's share, and a larger share pushes
// the bar's boundary further *left*. Rendered left-to-right, a descending
// ladder therefore puts each button on the same side as the boundary it
// produces. Ascending would read more naturally as numbers but would move
// the opposite way from the control it drives.
export const PERCENTAGE_LADDER = [100, 75, 50, 40, 25, 10, 5, 1, 0];

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
