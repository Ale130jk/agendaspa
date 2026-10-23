import { BadRequestError, NotFoundError } from '../../errors/app-error';
import { env } from '../../config/env';
import { formatInTimeZone } from 'date-fns-tz';
import { calculateAvailability, type AvailabilitySlot } from './availability.calculator';
import {
  getAvailabilityVersion,
  localDayRange,
  readAvailabilityCache,
  todayInTimeZone,
  writeAvailabilityCache,
} from './availability.cache';
import {
  findActiveBookings,
  findAvailabilityContext,
  findTimeOff,
  findWorkingHours,
} from './availability.repository';

export interface AvailabilityResult {
  staffId: string;
  serviceId: string;
  date: string;
  timeZone: string;
  slots: AvailabilitySlot[];
}

export async function getAvailability(
  serviceId: string,
  staffId: string,
  date: string,
  now = new Date(),
  useCache = true,
): Promise<AvailabilityResult> {
  const [service, staff, staffService] = await findAvailabilityContext(serviceId, staffId);

  if (!service || !service.isActive) {
    throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found');
  }

  if (!staff || !staff.isActive || !staff.user.isActive) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  if (!staffService) {
    throw new NotFoundError(
      'STAFF_SERVICE_NOT_FOUND',
      'This staff member does not offer the selected service',
    );
  }

  const today = todayInTimeZone(now, env.SPA_TIMEZONE);
  const maxDate = formatInTimeZone(
    new Date(now.getTime() + env.BOOKING_HORIZON_DAYS * 86_400_000),
    env.SPA_TIMEZONE,
    'yyyy-MM-dd',
  );

  if (date < today || date > maxDate) {
    throw new BadRequestError('DATE_OUT_OF_RANGE', `Date must be between ${today} and ${maxDate}`);
  }

  const version = useCache ? await getAvailabilityVersion(staffId) : 0;
  const cached = useCache ? await readAvailabilityCache(staffId, serviceId, date, version) : null;
  if (cached) {
    return {
      staffId,
      serviceId,
      date,
      timeZone: env.SPA_TIMEZONE,
      slots: cached,
    };
  }

  const { from, to } = localDayRange(date, env.SPA_TIMEZONE);
  const weekday = Number(formatInTimeZone(from, env.SPA_TIMEZONE, 'i'));

  const [workingHours, timeOff, bookings] = await Promise.all([
    findWorkingHours(staffId, weekday),
    findTimeOff(staffId, from, to),
    findActiveBookings(staffId, from, to),
  ]);

  const slots = calculateAvailability({
    date,
    timeZone: env.SPA_TIMEZONE,
    now,
    serviceDurationMinutes: service.durationMinutes,
    slotIntervalMinutes: env.SLOT_INTERVAL_MINUTES,
    workingHours,
    timeOff,
    bookings,
  });

  if (useCache) {
    await writeAvailabilityCache(staffId, serviceId, date, version, slots);
  }

  return {
    staffId,
    serviceId,
    date,
    timeZone: env.SPA_TIMEZONE,
    slots,
  };
}
