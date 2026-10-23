import { describe, expect, it } from 'vitest';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import {
  calculateAvailability,
  type AvailabilitySlot,
} from '../../src/modules/availability/availability.calculator';

const timeZone = 'America/Lima';
const date = '2026-10-26';
const now = new Date('2026-10-20T12:00:00.000Z');

const workingHours = [
  { weekday: 1, startMinute: 9 * 60, endMinute: 13 * 60 },
  { weekday: 1, startMinute: 14 * 60, endMinute: 18 * 60 },
];

function localTimes(slots: AvailabilitySlot[]): string[] {
  return slots.map((slot) => formatInTimeZone(new Date(slot.startAt), timeZone, 'HH:mm'));
}

function calculate(overrides: Partial<Parameters<typeof calculateAvailability>[0]> = {}) {
  return calculateAvailability({
    date,
    timeZone,
    now,
    serviceDurationMinutes: 60,
    slotIntervalMinutes: 15,
    workingHours,
    timeOff: [],
    bookings: [],
    ...overrides,
  });
}

describe('calculateAvailability', () => {
  it('generates slots inside working intervals and respects the service duration', () => {
    const slots = calculate();

    expect(localTimes(slots)).toEqual([
      '09:00',
      '09:15',
      '09:30',
      '09:45',
      '10:00',
      '10:15',
      '10:30',
      '10:45',
      '11:00',
      '11:15',
      '11:30',
      '11:45',
      '12:00',
      '14:00',
      '14:15',
      '14:30',
      '14:45',
      '15:00',
      '15:15',
      '15:30',
      '15:45',
      '16:00',
      '16:15',
      '16:30',
      '16:45',
      '17:00',
    ]);
  });

  it('removes slots that overlap an active booking', () => {
    const slots = calculate({
      bookings: [
        {
          startAt: fromZonedTime(`${date}T10:00:00`, timeZone),
          endAt: fromZonedTime(`${date}T11:00:00`, timeZone),
        },
      ],
    });

    expect(localTimes(slots)).not.toContain('09:15');
    expect(localTimes(slots)).not.toContain('10:00');
    expect(localTimes(slots)).not.toContain('10:45');
    expect(localTimes(slots)).toContain('09:00');
    expect(localTimes(slots)).toContain('11:00');
  });

  it('removes slots that overlap time off', () => {
    const times = localTimes(
      calculate({
        timeOff: [
          {
            startAt: fromZonedTime(`${date}T14:30:00`, timeZone),
            endAt: fromZonedTime(`${date}T15:30:00`, timeZone),
          },
        ],
      }),
    );

    expect(times).not.toContain('14:00');
    expect(times).not.toContain('14:15');
    expect(times).not.toContain('15:00');
    expect(times).toContain('15:30');
  });

  it('does not return slots that already started', () => {
    const times = localTimes(
      calculate({
        now: fromZonedTime(`${date}T10:05:00`, timeZone),
      }),
    );

    expect(times).not.toContain('09:00');
    expect(times).not.toContain('10:00');
    expect(times).toContain('10:15');
  });

  it('returns no slots for a day without working hours', () => {
    expect(calculate({ workingHours: [] })).toEqual([]);
  });

  it('returns no slots for an invalid calendar date', () => {
    expect(calculate({ date: '2026-02-31' })).toEqual([]);
  });

  it('supports services longer than the slot interval', () => {
    const slots = calculate({ serviceDurationMinutes: 90 });
    const times = localTimes(slots);

    expect(times).toContain('11:30');
    expect(times).not.toContain('12:00');
    expect(times).toContain('16:30');
    expect(times).not.toContain('17:00');
  });
});
