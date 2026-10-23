import { describe, expect, it } from 'vitest';
import {
  addDaysToDateInput,
  canClientCancel,
  formatMoney,
  formatTime,
  initials,
  minutesToTime,
  timeToMinutes,
} from './format';

describe('format helpers', () => {
  it('formats money in PEN', () => {
    expect(formatMoney(18_000)).toContain('180.00');
  });

  it('formats instants in the Lima timezone', () => {
    expect(formatTime('2026-10-22T15:00:00.000Z')).toBe('10:00');
  });

  it('converts minutes to time and back', () => {
    expect(minutesToTime(9 * 60 + 30)).toBe('09:30');
    expect(timeToMinutes('09:30')).toBe(570);
  });

  it('adds days to date inputs without timezone drift', () => {
    expect(addDaysToDateInput('2026-10-22', 7)).toBe('2026-10-29');
  });

  it('only allows client cancellation outside the 24 hour window', () => {
    const soon = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const later = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    expect(canClientCancel({ startAt: soon, status: 'CONFIRMED' })).toBe(false);
    expect(canClientCancel({ startAt: later, status: 'CONFIRMED' })).toBe(true);
    expect(canClientCancel({ startAt: later, status: 'CANCELLED' })).toBe(false);
  });

  it('builds initials from the first two names', () => {
    expect(initials('Lucía Vargas')).toBe('LV');
    expect(initials('Ana')).toBe('A');
  });
});
