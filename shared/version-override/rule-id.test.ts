import { describe, expect, it } from 'vitest';
import { hostnameToRuleId } from '@/shared/version-override/rule-id';

describe('hostnameToRuleId', () => {
  it('is deterministic for the same hostname', () => {
    expect(hostnameToRuleId('example.com')).toBe(hostnameToRuleId('example.com'));
  });

  it('produces a positive integer', () => {
    expect(Number.isInteger(hostnameToRuleId('example.com'))).toBe(true);
    expect(hostnameToRuleId('example.com')).toBeGreaterThan(0);
  });

  it('differs for different hostnames', () => {
    expect(hostnameToRuleId('example.com')).not.toBe(hostnameToRuleId('example.org'));
  });
});
