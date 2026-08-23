import { describe, expect, it } from 'vitest';
import {
  formatPercentage,
  snapPercentage,
} from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';

describe('snapPercentage', () => {
  it('snaps near-zero values down to exactly 0', () => {
    expect(snapPercentage(0.01)).toBe(0);
  });

  it('snaps near-100 values up to exactly 100', () => {
    expect(snapPercentage(99.8)).toBe(100);
  });

  it('snaps sub-1% values to the nearest 0.05', () => {
    expect(snapPercentage(0.37)).toBeCloseTo(0.35);
  });

  it('snaps 1-5% values to the nearest half point', () => {
    expect(snapPercentage(3.3)).toBe(3.5);
  });

  it('rounds values above 5% to the nearest whole percentage', () => {
    expect(snapPercentage(41.6)).toBe(42);
  });
});

describe('formatPercentage', () => {
  it('formats zero as a bare 0', () => {
    expect(formatPercentage(0)).toBe('0');
  });

  it('trims a trailing zero off sub-1% values', () => {
    expect(formatPercentage(0.5)).toBe('0.5');
  });

  it('formats whole numbers with no decimal point', () => {
    expect(formatPercentage(40)).toBe('40');
  });

  it('formats fractional values above 1 with one decimal place', () => {
    expect(formatPercentage(2.5)).toBe('2.5');
  });
});
