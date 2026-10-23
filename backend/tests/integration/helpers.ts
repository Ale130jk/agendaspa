import { randomUUID } from 'node:crypto';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Prisma, Role } from '@prisma/client';
import request from 'supertest';
import type { Response } from 'supertest';
import { createApp } from '../../src/app';
import { hashPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';
import { getRedis } from '../../src/lib/redis';

export const app = createApp();
export const timeZone = 'America/Lima';

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export function idempotencyKey(): string {
  return randomUUID();
}

export function localDate(daysFromNow = 7): string {
  return formatInTimeZone(addDays(new Date(), daysFromNow), timeZone, 'yyyy-MM-dd');
}

export function localDateTime(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timeZone);
}

export function localTime(date: Date): string {
  return formatInTimeZone(date, timeZone, 'HH:mm');
}

export function cookieFrom(response: Response, name: string): string {
  const header = response.headers['set-cookie'] as unknown;
  const list = Array.isArray(header) ? header : typeof header === 'string' ? [header] : [];
  const cookie = list
    .map((value) => String(value).split(';')[0] ?? '')
    .find((value) => value.startsWith(`${name}=`));

  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }

  return cookie;
}

export async function resetDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');

  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to truncate non-test database: ${databaseName}`);
  }

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "RefreshToken", "Booking", "TimeOff", "WorkingHours", "StaffService", "StaffProfile", "Service", "User" CASCADE',
  );

  try {
    const redis = await Promise.race([
      getRedis(),
      new Promise<never>((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Redis unavailable')), 2_000);
        timer.unref();
      }),
    ]);
    await redis.flushDb();
  } catch {
    // Availability cache is fail-open, so integration tests can run without Redis.
  }
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  phone?: string | null;
  isActive?: boolean;
}): Promise<{ id: string; email: string }> {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName,
      role: input.role ?? 'CLIENT',
      phone: input.phone ?? null,
      isActive: input.isActive ?? true,
    },
    select: { id: true, email: true },
  });
}

export async function login(email: string, password: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(response.body)}`);
  }

  return response.body.accessToken as string;
}

export async function createService(input: Partial<Prisma.ServiceUncheckedCreateInput> = {}) {
  return prisma.service.create({
    data: {
      name: input.name ?? `Masaje ${randomUUID().slice(0, 8)}`,
      description: input.description ?? 'Servicio de prueba',
      durationMinutes: input.durationMinutes ?? 60,
      priceCents: input.priceCents ?? 18_000,
      isActive: input.isActive ?? true,
    },
  });
}

export async function createStaffFixture(input: {
  email: string;
  password: string;
  fullName: string;
  serviceIds?: string[];
  workingHours?: Array<{ weekday: number; startMinute: number; endMinute: number }>;
  isActive?: boolean;
}) {
  const user = await createUser({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    role: 'STAFF',
    isActive: input.isActive ?? true,
  });

  const profile = await prisma.staffProfile.create({
    data: {
      userId: user.id,
      bio: `${input.fullName} bio`,
      isActive: input.isActive ?? true,
    },
  });

  if (input.serviceIds?.length) {
    await prisma.staffService.createMany({
      data: input.serviceIds.map((serviceId) => ({ staffId: profile.id, serviceId })),
    });
  }

  const hours =
    input.workingHours ??
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      startMinute: 9 * 60,
      endMinute: 18 * 60,
    }));

  if (hours.length) {
    await prisma.workingHours.createMany({
      data: hours.map((hour) => ({ ...hour, staffId: profile.id })),
    });
  }

  return { user, profile };
}

export async function createBookingForTest(input: {
  clientId: string;
  staffId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  expiresAt?: Date;
}): Promise<{ id: string }> {
  const booking = await prisma.booking.create({
    data: {
      clientId: input.clientId,
      staffId: input.staffId,
      serviceId: input.serviceId,
      status: input.status ?? 'CONFIRMED',
      startAt: input.startAt,
      endAt: input.endAt,
      expiresAt: input.expiresAt ?? new Date(input.startAt.getTime() + 300_000),
      idempotencyKey: randomUUID(),
      requestHash: randomUUID().replaceAll('-', ''),
      confirmedAt: input.status === 'CONFIRMED' ? new Date() : null,
    },
    select: { id: true },
  });

  return booking;
}
