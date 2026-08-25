import { describe, expect, it } from 'vitest';
import { parseHostnameInput } from '@/entrypoints/sidepanel/tabs/parse-hostname-input';

describe('parseHostnameInput', () => {
  it('extracts the hostname from a full https URL', () => {
    expect(parseHostnameInput('https://example.com/path?query=1')).toBe('example.com');
  });

  it('extracts the hostname from a full http URL', () => {
    expect(parseHostnameInput('http://example.com')).toBe('example.com');
  });

  it('accepts a bare hostname with no scheme', () => {
    expect(parseHostnameInput('example.com')).toBe('example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(parseHostnameInput('  example.com  ')).toBe('example.com');
  });

  it('lowercases the result', () => {
    expect(parseHostnameInput('Example.COM')).toBe('example.com');
  });

  it('handles a subdomain', () => {
    expect(parseHostnameInput('sub.example.com')).toBe('sub.example.com');
  });

  it('rejects empty input', () => {
    expect(parseHostnameInput('   ')).toBeNull();
  });

  it('rejects a single word with no dot', () => {
    expect(parseHostnameInput('localhost')).toBeNull();
  });

  it('rejects a non-http(s) scheme', () => {
    expect(parseHostnameInput('ftp://example.com')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(parseHostnameInput('not a url at all')).toBeNull();
  });
});
