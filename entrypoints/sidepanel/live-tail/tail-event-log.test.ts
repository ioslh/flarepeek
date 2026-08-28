import { describe, expect, it } from 'vitest';
import type { LiveTailEvent } from '@/shared/cloudflare-api/tail';
import {
  LIVE_TAIL_EVENT_CAP,
  matchesFilter,
  outcomeMessageKey,
  outcomeTone,
  pushCapped,
} from '@/entrypoints/sidepanel/live-tail/tail-event-log';

function makeEvent(overrides: Partial<LiveTailEvent> = {}): LiveTailEvent {
  return {
    scriptName: 'my-worker',
    eventTimestamp: 1000,
    outcome: 'ok',
    detail: { kind: 'none' },
    logs: [],
    exceptions: [],
    ...overrides,
  };
}

describe('pushCapped', () => {
  it('appends to the end, oldest first', () => {
    const buffer = [makeEvent({ eventTimestamp: 1 })];
    const result = pushCapped(buffer, makeEvent({ eventTimestamp: 2 }), 10);
    expect(result.map((event) => event.eventTimestamp)).toEqual([1, 2]);
  });

  it('drops the oldest entries once the cap is exceeded', () => {
    const buffer = [makeEvent({ eventTimestamp: 1 }), makeEvent({ eventTimestamp: 2 })];
    const result = pushCapped(buffer, makeEvent({ eventTimestamp: 3 }), 2);
    expect(result.map((event) => event.eventTimestamp)).toEqual([2, 3]);
  });

  it('defaults to LIVE_TAIL_EVENT_CAP when no cap is given', () => {
    const buffer = Array.from({ length: LIVE_TAIL_EVENT_CAP }, (_, i) =>
      makeEvent({ eventTimestamp: i }),
    );
    const result = pushCapped(buffer, makeEvent({ eventTimestamp: LIVE_TAIL_EVENT_CAP }));
    expect(result).toHaveLength(LIVE_TAIL_EVENT_CAP);
    expect(result[0]?.eventTimestamp).toBe(1);
  });
});

describe('matchesFilter', () => {
  it('matches everything for an empty/whitespace query', () => {
    expect(matchesFilter(makeEvent(), '')).toBe(true);
    expect(matchesFilter(makeEvent(), '   ')).toBe(true);
  });

  it('matches a request URL case-insensitively', () => {
    const event = makeEvent({
      detail: { kind: 'request', method: 'GET', url: 'https://example.test/checkout', status: 200 },
    });
    expect(matchesFilter(event, 'CHECKOUT')).toBe(true);
    expect(matchesFilter(event, 'billing')).toBe(false);
  });

  it('matches exception name and message', () => {
    const event = makeEvent({
      exceptions: [{ timestamp: 1, name: 'TypeError', message: 'cannot read property' }],
    });
    expect(matchesFilter(event, 'typeerror')).toBe(true);
    expect(matchesFilter(event, 'property')).toBe(true);
    expect(matchesFilter(event, 'reference')).toBe(false);
  });

  it('matches log message parts, stringifying non-string parts', () => {
    const event = makeEvent({
      logs: [{ timestamp: 1, level: 'log', message: ['user', { id: 42 }] }],
    });
    expect(matchesFilter(event, 'user')).toBe(true);
    expect(matchesFilter(event, '"id":42')).toBe(true);
    expect(matchesFilter(event, 'missing')).toBe(false);
  });
});

describe('outcomeMessageKey', () => {
  it('returns the specific key for known outcomes', () => {
    expect(outcomeMessageKey('ok')).toBe('liveTailOutcomeOk');
    expect(outcomeMessageKey('exceededCpu')).toBe('liveTailOutcomeExceededCpu');
  });

  it('falls back to a generic key for an unrecognised outcome', () => {
    expect(outcomeMessageKey('somethingNew')).toBe('liveTailOutcomeOther');
  });
});

describe('outcomeTone', () => {
  it('treats ok and canceled as the neutral tone', () => {
    expect(outcomeTone('ok')).toBe('default');
    expect(outcomeTone('canceled')).toBe('default');
  });

  it('treats everything else as destructive', () => {
    expect(outcomeTone('exception')).toBe('destructive');
    expect(outcomeTone('exceededCpu')).toBe('destructive');
    expect(outcomeTone('somethingNew')).toBe('destructive');
  });
});
