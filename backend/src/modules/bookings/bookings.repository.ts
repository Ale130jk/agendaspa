import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { BookingCursor } from './bookings.cursor';
import { bookingInclude, type BookingWithRelations } from './bookings.presenter';

type Db = Prisma.TransactionClient | typeof prisma;

export function findBookingById(id: string): Promise<BookingWithRelations | null> {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

export function findByIdempotencyKey(
  clientId: string,
  idempotencyKey: string,
): Promise<BookingWithRelations | null> {
  return prisma.booking.findUnique({
    where: { clientId_idempotencyKey: { clientId, idempotencyKey } },
    include: bookingInclude,
  });
}

export function findOverlappingBooking(
  db: Db,
  staffId: string,
  startAt: Date,
  endAt: Date,
): Promise<{ id: string } | null> {
  return db.booking.findFirst({
    where: {
      staffId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
}

export function createBooking(
  db: Db,
  data: Prisma.BookingUncheckedCreateInput,
): Promise<BookingWithRelations> {
  return db.booking.create({ data, include: bookingInclude });
}

export function updateBooking(
  id: string,
  data: Prisma.BookingUpdateInput,
): Promise<BookingWithRelations> {
  return prisma.booking.update({ where: { id }, data, include: bookingInclude });
}

export function updateBookingStatus(
  id: string,
  data: Prisma.BookingUpdateManyMutationInput,
): Promise<{ count: number }> {
  return prisma.booking.updateMany({ where: { id }, data });
}

export function cancelPendingBooking(id: string, now: Date): Promise<{ count: number }> {
  return prisma.booking.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: now },
  });
}

export async function findBookingsPage(
  where: Prisma.BookingWhereInput,
  cursor: BookingCursor | undefined,
  limit: number,
  order: 'asc' | 'desc',
): Promise<{ rows: BookingWithRelations[]; nextCursor: string | null }> {
  const cursorWhere: Prisma.BookingWhereInput | undefined = cursor
    ? {
        OR: [
          { startAt: { lt: cursor.startAt } },
          { startAt: cursor.startAt, id: { lt: cursor.id } },
        ],
      }
    : undefined;

  const rows = await prisma.booking.findMany({
    where: cursorWhere ? { AND: [where, cursorWhere] } : where,
    include: bookingInclude,
    orderBy: [{ startAt: order }, { id: order }],
    take: limit + 1,
  });

  const page = rows.slice(0, limit);
  const last = page.at(-1);

  return {
    rows: page,
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}

export function findAgendaBookings(where: Prisma.BookingWhereInput) {
  return prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { startAt: 'asc' },
    take: 500,
  });
}

export function findExpiredPendingBookings(now: Date) {
  return prisma.booking.findMany({
    where: { status: 'PENDING', expiresAt: { lte: now } },
    select: { id: true, staffId: true, startAt: true },
  });
}

export function cancelExpiredPendingBookings(ids: string[], now: Date) {
  return prisma.booking.updateMany({
    where: { id: { in: ids }, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelledAt: now },
  });
}

function encodeCursor(booking: { startAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ startAt: booking.startAt.toISOString(), id: booking.id }),
    'utf8',
  ).toString('base64url');
}
