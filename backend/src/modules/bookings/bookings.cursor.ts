import { z } from 'zod';
import { BadRequestError } from '../../errors/app-error';

const cursorSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export interface BookingCursor {
  startAt: Date;
  id: string;
}

export function encodeBookingCursor(booking: { startAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ startAt: booking.startAt.toISOString(), id: booking.id }),
    'utf8',
  ).toString('base64url');
}

export function decodeBookingCursor(raw: string | undefined): BookingCursor | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
    return { startAt: new Date(parsed.startAt), id: parsed.id };
  } catch {
    throw new BadRequestError('INVALID_CURSOR', 'Pagination cursor is invalid');
  }
}
