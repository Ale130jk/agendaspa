import { createHash } from 'node:crypto';
import { addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { BookingStatus, Prisma, Role } from '@prisma/client';
import { env } from '../../config/env';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  isExclusionViolation,
  isUniqueViolation,
} from '../../errors/app-error';
import { prisma } from '../../lib/prisma';
import { invalidateAvailability } from '../availability/availability.cache';
import { getAvailability } from '../availability/availability.service';
import {
  cancelExpiredPendingBookings,
  cancelPendingBooking,
  createBooking,
  findAgendaBookings,
  findBookingById,
  findBookingsPage,
  findByIdempotencyKey,
  findExpiredPendingBookings,
  findOverlappingBooking,
  updateBooking,
} from './bookings.repository';
import { decodeBookingCursor } from './bookings.cursor';
import { presentBooking, type BookingView } from './bookings.presenter';
import type {
  AgendaQuery,
  CreateBookingInput,
  ListBookingsQuery,
  ListMyBookingsQuery,
} from './bookings.schemas';

interface Actor {
  id: string;
  role: Role;
}

interface BookingAction {
  booking: BookingView;
  replayed?: boolean;
}

function hashRequest(input: CreateBookingInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        serviceId: input.serviceId,
        staffId: input.staffId,
        startAt: input.startAt.toISOString(),
      }),
    )
    .digest('hex');
}

function replayExisting(
  existing: Parameters<typeof presentBooking>[0],
  requestHash: string,
): BookingAction {
  if (existing.requestHash !== requestHash) {
    throw new UnprocessableEntityError(
      'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used with a different request',
    );
  }

  return { booking: presentBooking(existing), replayed: true };
}

async function resolveStaffId(actor: Actor): Promise<string> {
  if (actor.role !== 'STAFF') {
    throw new ForbiddenError('AUTH_FORBIDDEN', 'This action requires a staff account');
  }

  const profile = await prisma.staffProfile.findUnique({
    where: { userId: actor.id },
    select: { id: true },
  });

  if (!profile) {
    throw new ForbiddenError('AUTH_FORBIDDEN', 'Staff profile not found');
  }

  return profile.id;
}

function assertCanView(
  actor: Actor,
  booking: NonNullable<Awaited<ReturnType<typeof findBookingById>>>,
  staffId?: string,
): void {
  if (actor.role === 'ADMIN') {
    return;
  }

  if (actor.role === 'CLIENT' && booking.clientId === actor.id) {
    return;
  }

  if (actor.role === 'STAFF' && staffId && booking.staffId === staffId) {
    return;
  }

  throw new ForbiddenError('BOOKING_FORBIDDEN', 'You cannot access this booking');
}

function assertCanComplete(
  actor: Actor,
  booking: NonNullable<Awaited<ReturnType<typeof findBookingById>>>,
  staffId?: string,
): void {
  if (actor.role === 'ADMIN') {
    return;
  }

  if (actor.role === 'STAFF' && staffId && booking.staffId === staffId) {
    return;
  }

  throw new ForbiddenError('BOOKING_FORBIDDEN', 'Only the assigned staff member can complete it');
}

export async function createBookingForClient(
  clientId: string,
  input: CreateBookingInput,
  idempotencyKey: string,
): Promise<BookingAction> {
  const now = new Date();
  const requestHash = hashRequest(input);

  const existing = await findByIdempotencyKey(clientId, idempotencyKey);
  if (existing) {
    return replayExisting(existing, requestHash);
  }

  const [service, staff, staffService] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.staffProfile.findUnique({
      where: { id: input.staffId },
      include: { user: { select: { isActive: true } } },
    }),
    prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId: input.staffId,
          serviceId: input.serviceId,
        },
      },
    }),
  ]);

  if (!service || !service.isActive) {
    throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found');
  }

  if (!staff || !staff.isActive || !staff.user.isActive) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  if (!staffService) {
    throw new BadRequestError(
      'STAFF_SERVICE_NOT_FOUND',
      'This staff member does not offer the selected service',
    );
  }

  const startAt = input.startAt;
  const endAt = addMinutes(startAt, service.durationMinutes);
  const localDate = formatInTimeZone(startAt, env.SPA_TIMEZONE, 'yyyy-MM-dd');
  const today = formatInTimeZone(now, env.SPA_TIMEZONE, 'yyyy-MM-dd');
  const maxDate = formatInTimeZone(
    new Date(now.getTime() + env.BOOKING_HORIZON_DAYS * 86_400_000),
    env.SPA_TIMEZONE,
    'yyyy-MM-dd',
  );

  if (startAt <= now) {
    throw new ConflictError('SLOT_IN_PAST', 'The selected slot is in the past');
  }

  if (localDate < today || localDate > maxDate) {
    throw new BadRequestError(
      'DATE_OUT_OF_RANGE',
      `Booking date must be between ${today} and ${maxDate}`,
    );
  }

  const localTime = formatInTimeZone(startAt, env.SPA_TIMEZONE, 'HH:mm:ss');
  const [hour, minute, second] = localTime.split(':').map(Number);
  const localMinutes = (hour ?? 0) * 60 + (minute ?? 0);

  if (second !== 0 || localMinutes % env.SLOT_INTERVAL_MINUTES !== 0) {
    throw new BadRequestError(
      'SLOT_ALIGNMENT',
      `Bookings must start on a ${env.SLOT_INTERVAL_MINUTES}-minute boundary`,
    );
  }

  try {
    const availability = await getAvailability(
      input.serviceId,
      input.staffId,
      localDate,
      now,
      false,
    );

    if (!availability.slots.some((slot) => slot.startAt === startAt.toISOString())) {
      throw new ConflictError('SLOT_TAKEN', 'The selected slot is no longer available');
    }

    const created = await prisma.$transaction(async (tx) => {
      const overlap = await findOverlappingBooking(tx, input.staffId, startAt, endAt);
      if (overlap) {
        throw new ConflictError('SLOT_TAKEN', 'The selected slot is no longer available');
      }

      return createBooking(tx, {
        clientId,
        staffId: input.staffId,
        serviceId: input.serviceId,
        status: 'PENDING',
        startAt,
        endAt,
        expiresAt: new Date(now.getTime() + env.PENDING_BOOKING_TTL_SECONDS * 1000),
        idempotencyKey,
        requestHash,
      });
    });

    await invalidateAvailability(input.staffId);
    return { booking: presentBooking(created), replayed: false };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === 'SLOT_TAKEN') {
        const existingAfterRace = await findByIdempotencyKey(clientId, idempotencyKey);
        if (existingAfterRace) {
          return replayExisting(existingAfterRace, requestHash);
        }
      }

      throw error;
    }

    if (isExclusionViolation(error) || isUniqueViolation(error)) {
      const existingAfterRace = await findByIdempotencyKey(clientId, idempotencyKey);
      if (existingAfterRace) {
        return replayExisting(existingAfterRace, requestHash);
      }

      throw new ConflictError('SLOT_TAKEN', 'The selected slot is no longer available');
    }

    throw error;
  }
}

export async function getBookingForActor(actor: Actor, id: string): Promise<BookingView> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND', 'Booking not found');
  }

  const staffId = actor.role === 'STAFF' ? await resolveStaffId(actor) : undefined;
  assertCanView(actor, booking, staffId);
  return presentBooking(booking);
}

export async function confirmBooking(actor: Actor, id: string): Promise<BookingView> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND', 'Booking not found');
  }

  const staffId = actor.role === 'STAFF' ? await resolveStaffId(actor) : undefined;
  assertCanView(actor, booking, staffId);

  if (booking.status === 'CONFIRMED') {
    return presentBooking(booking);
  }

  if (booking.status !== 'PENDING') {
    throw new ConflictError('BOOKING_NOT_PENDING', 'Booking is not pending confirmation');
  }

  const now = new Date();

  if (booking.expiresAt.getTime() <= now.getTime()) {
    const cancelled = await cancelPendingBooking(id, now);
    if (cancelled.count > 0) {
      await invalidateAvailability(booking.staffId);
    }
    throw new ConflictError('BOOKING_EXPIRED', 'Pending booking has expired');
  }

  if (booking.startAt.getTime() <= now.getTime()) {
    throw new ConflictError('BOOKING_STARTED', 'Booking has already started');
  }

  const updated = await updateBooking(id, { status: 'CONFIRMED', confirmedAt: now });
  return presentBooking(updated);
}

export async function cancelBooking(actor: Actor, id: string): Promise<BookingView> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND', 'Booking not found');
  }

  const staffId = actor.role === 'STAFF' ? await resolveStaffId(actor) : undefined;
  assertCanView(actor, booking, staffId);

  if (booking.status === 'CANCELLED') {
    return presentBooking(booking);
  }

  if (booking.status === 'COMPLETED') {
    throw new ConflictError('BOOKING_COMPLETED', 'Completed bookings cannot be cancelled');
  }

  if (actor.role === 'CLIENT') {
    const windowMs = env.CANCELLATION_WINDOW_HOURS * 3_600_000;
    if (booking.startAt.getTime() - Date.now() < windowMs) {
      throw new ForbiddenError(
        'CANCELLATION_WINDOW_PASSED',
        `Bookings can only be cancelled at least ${env.CANCELLATION_WINDOW_HOURS} hours in advance`,
      );
    }
  }

  const now = new Date();
  const cancelled = await prisma.booking.updateMany({
    where: { id, status: { in: ['PENDING', 'CONFIRMED'] } },
    data: { status: 'CANCELLED', cancelledAt: now },
  });

  if (cancelled.count > 0) {
    await invalidateAvailability(booking.staffId);
  }

  const updated = await findBookingById(id);
  if (!updated) {
    throw new NotFoundError('BOOKING_NOT_FOUND', 'Booking not found');
  }

  if (updated.status !== 'CANCELLED' && cancelled.count === 0) {
    throw new ConflictError('BOOKING_STATE_CHANGED', 'Booking could not be cancelled');
  }

  return presentBooking(updated);
}

export async function completeBooking(actor: Actor, id: string): Promise<BookingView> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new NotFoundError('BOOKING_NOT_FOUND', 'Booking not found');
  }

  const staffId = actor.role === 'STAFF' ? await resolveStaffId(actor) : undefined;
  assertCanComplete(actor, booking, staffId);

  if (booking.status === 'COMPLETED') {
    return presentBooking(booking);
  }

  if (booking.status !== 'CONFIRMED') {
    throw new ConflictError('BOOKING_NOT_CONFIRMED', 'Only confirmed bookings can be completed');
  }

  if (booking.startAt.getTime() > Date.now()) {
    throw new ConflictError('BOOKING_NOT_STARTED', 'Booking has not started yet');
  }

  const updated = await updateBooking(id, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  return presentBooking(updated);
}

export async function listMyBookings(
  clientId: string,
  query: ListMyBookingsQuery,
): Promise<{ data: BookingView[]; nextCursor: string | null }> {
  const cursor = decodeBookingCursor(query.cursor);
  const where: Prisma.BookingWhereInput = {
    clientId,
    ...(query.status ? { status: query.status } : {}),
  };

  const page = await findBookingsPage(where, cursor, query.limit, 'desc');

  return {
    data: page.rows.map(presentBooking),
    nextCursor: page.nextCursor,
  };
}

export async function listBookingsForActor(
  actor: Actor,
  query: ListBookingsQuery,
): Promise<{ data: BookingView[]; nextCursor: string | null }> {
  let staffId = query.staffId;

  if (actor.role === 'STAFF') {
    const ownStaffId = await resolveStaffId(actor);
    if (query.staffId && query.staffId !== ownStaffId) {
      throw new ForbiddenError('AUTH_FORBIDDEN', 'Staff can only list their own bookings');
    }
    staffId = ownStaffId;
  }

  const cursor = decodeBookingCursor(query.cursor);
  const where: Prisma.BookingWhereInput = {
    ...(staffId ? { staffId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          startAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lt: query.to } : {}),
          },
        }
      : {}),
  };

  const page = await findBookingsPage(where, cursor, query.limit, 'desc');

  return {
    data: page.rows.map(presentBooking),
    nextCursor: page.nextCursor,
  };
}

export async function getAgenda(
  actor: Actor,
  query: AgendaQuery,
): Promise<{ data: BookingView[] }> {
  let staffId = query.staffId;

  if (actor.role === 'STAFF') {
    const ownStaffId = await resolveStaffId(actor);
    if (query.staffId && query.staffId !== ownStaffId) {
      throw new ForbiddenError('AUTH_FORBIDDEN', 'Staff can only view their own agenda');
    }
    staffId = ownStaffId;
  }

  const rows = await findAgendaBookings({
    ...(staffId ? { staffId } : {}),
    startAt: { gte: query.from, lt: query.to },
    ...(!query.includeCancelled ? { status: { not: 'CANCELLED' as BookingStatus } } : {}),
  });

  return { data: rows.map(presentBooking) };
}

export async function expirePendingBookings(): Promise<number> {
  const now = new Date();
  const expired = await findExpiredPendingBookings(now);
  if (expired.length === 0) {
    return 0;
  }

  const result = await cancelExpiredPendingBookings(
    expired.map((booking) => booking.id),
    now,
  );

  const staffIds = [...new Set(expired.map((booking) => booking.staffId))];
  await Promise.all(staffIds.map((staffId) => invalidateAvailability(staffId)));

  return result.count;
}
