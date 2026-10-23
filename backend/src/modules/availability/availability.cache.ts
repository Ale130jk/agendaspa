import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { getRedis } from '../../lib/redis';
import type { AvailabilitySlot } from './availability.calculator';
import { findStaffIdsForService } from './availability.repository';

const KEY_PREFIX = 'availability';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Redis timeout')), ms);
      timer.unref();
    }),
  ]);
}

export async function getAvailabilityVersion(staffId: string): Promise<number> {
  try {
    const client = await withTimeout(getRedis(), 300);
    const value = await withTimeout(client.get(`${KEY_PREFIX}:version:${staffId}`), 300);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

export async function readAvailabilityCache(
  staffId: string,
  serviceId: string,
  date: string,
  version: number,
): Promise<AvailabilitySlot[] | null> {
  try {
    const client = await withTimeout(getRedis(), 300);
    const raw = await withTimeout(
      client.get(`${KEY_PREFIX}:v${version}:${staffId}:${serviceId}:${date}`),
      300,
    );
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AvailabilitySlot[]) : null;
  } catch {
    return null;
  }
}

export async function writeAvailabilityCache(
  staffId: string,
  serviceId: string,
  date: string,
  version: number,
  slots: AvailabilitySlot[],
): Promise<void> {
  try {
    const client = await withTimeout(getRedis(), 300);
    await withTimeout(
      client.set(
        `${KEY_PREFIX}:v${version}:${staffId}:${serviceId}:${date}`,
        JSON.stringify(slots),
        { EX: env.AVAILABILITY_CACHE_TTL_SECONDS },
      ),
      300,
    );
  } catch {
    // Cache is optional: availability is still correct without Redis.
  }
}

export async function invalidateAvailability(staffId: string): Promise<void> {
  try {
    const client = await withTimeout(getRedis(), 300);
    const key = `${KEY_PREFIX}:version:${staffId}`;
    await withTimeout(client.incr(key), 300);
    await withTimeout(client.expire(key, 86_400), 300);
  } catch (error) {
    logger.debug({ err: error, staffId }, 'Could not invalidate availability cache');
  }
}

export async function invalidateServiceAvailability(serviceId: string): Promise<void> {
  const staffIds = await findStaffIdsForService(serviceId);
  await Promise.all(staffIds.map((staffId) => invalidateAvailability(staffId)));
}

export function localDayRange(date: string, timeZone: string): { from: Date; to: Date } {
  const from = fromZonedTime(`${date}T00:00:00`, timeZone);
  return { from, to: addDays(from, 1) };
}

export function todayInTimeZone(now: Date, timeZone: string): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}
