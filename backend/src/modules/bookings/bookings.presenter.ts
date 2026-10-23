import { Prisma, type BookingStatus } from '@prisma/client';

export const bookingInclude = {
  service: true,
  staff: { include: { user: { select: { fullName: true } } } },
  client: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

export interface BookingView {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
  staff: {
    id: string;
    fullName: string;
  };
  client: {
    id: string;
    fullName: string;
    email: string;
  };
}

export function presentBooking(booking: BookingWithRelations): BookingView {
  return {
    id: booking.id,
    status: booking.status,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    expiresAt: booking.expiresAt.toISOString(),
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    service: {
      id: booking.service.id,
      name: booking.service.name,
      durationMinutes: booking.service.durationMinutes,
      priceCents: booking.service.priceCents,
    },
    staff: {
      id: booking.staff.id,
      fullName: booking.staff.user.fullName,
    },
    client: {
      id: booking.client.id,
      fullName: booking.client.fullName,
      email: booking.client.email,
    },
  };
}
