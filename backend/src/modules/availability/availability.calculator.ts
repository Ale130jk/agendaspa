import { addMinutes, isValid } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface WorkingInterval {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface BusyInterval {
  startAt: Date;
  endAt: Date;
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

export interface CalculateAvailabilityInput {
  date: string;
  timeZone: string;
  now: Date;
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  workingHours: WorkingInterval[];
  timeOff: BusyInterval[];
  bookings: BusyInterval[];
}

function overlaps(slotStart: Date, slotEnd: Date, busy: BusyInterval[]): boolean {
  return busy.some((item) => slotStart < item.endAt && slotEnd > item.startAt);
}

function toLocalTime(date: string, minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${date}T${hours}:${minute}:00`;
}

export function calculateAvailability(input: CalculateAvailabilityInput): AvailabilitySlot[] {
  const dayStart = fromZonedTime(`${input.date}T00:00:00`, input.timeZone);

  if (
    !isValid(dayStart) ||
    formatInTimeZone(dayStart, input.timeZone, 'yyyy-MM-dd') !== input.date
  ) {
    return [];
  }

  const weekday = Number(formatInTimeZone(dayStart, input.timeZone, 'i'));
  const intervals = input.workingHours.filter((interval) => interval.weekday === weekday);
  const slots = new Map<string, AvailabilitySlot>();

  for (const interval of intervals) {
    for (
      let minute = interval.startMinute;
      minute + input.serviceDurationMinutes <= interval.endMinute;
      minute += input.slotIntervalMinutes
    ) {
      const startAt = fromZonedTime(toLocalTime(input.date, minute), input.timeZone);
      const endAt = addMinutes(startAt, input.serviceDurationMinutes);

      if (startAt <= input.now) {
        continue;
      }

      if (overlaps(startAt, endAt, input.timeOff) || overlaps(startAt, endAt, input.bookings)) {
        continue;
      }

      slots.set(startAt.toISOString(), {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
    }
  }

  return [...slots.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getWeekdayInTimeZone(date: Date, timeZone: string): number {
  return Number(formatInTimeZone(date, timeZone, 'i'));
}

export function startOfLocalDay(date: string, timeZone: string): Date {
  return fromZonedTime(`${date}T00:00:00`, timeZone);
}

export function addLocalDays(date: string, days: number, timeZone: string): string {
  const start = startOfLocalDay(date, timeZone);
  return formatInTimeZone(addMinutes(start, days * 24 * 60), timeZone, 'yyyy-MM-dd');
}
