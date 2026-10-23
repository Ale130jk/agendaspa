import { describe, expect, it } from 'vitest';
import { BadRequestError } from '../../src/errors/app-error';
import {
  decodeBookingCursor,
  encodeBookingCursor,
} from '../../src/modules/bookings/bookings.cursor';

describe('booking cursor', () => {
  it('round-trips a cursor', () => {
    const cursor = {
      startAt: new Date('2026-11-04T15:30:00.000Z'),
      id: '3d5f0a6f-1b38-4f53-9a42-4f2bb6c69f0e',
    };

    const decoded = decodeBookingCursor(encodeBookingCursor(cursor));

    expect(decoded?.id).toBe(cursor.id);
    expect(decoded?.startAt.toISOString()).toBe(cursor.startAt.toISOString());
  });

  it('returns undefined when there is no cursor', () => {
    expect(decodeBookingCursor(undefined)).toBeUndefined();
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeBookingCursor('not-a-cursor')).toThrow(BadRequestError);
  });
});
