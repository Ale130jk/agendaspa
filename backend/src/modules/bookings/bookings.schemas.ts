import { z } from 'zod';

export const bookingStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

const isoDateTime = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const status = z.enum(bookingStatuses).optional();
const cursor = z.string().trim().min(1).max(500).optional();
const limit = z.coerce.number().int().min(1).max(50).default(20);

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  startAt: isoDateTime,
});

export const idempotencyHeadersSchema = z.object({
  'idempotency-key': z.string().trim().min(8).max(128),
});

export const bookingIdParamsSchema = z.object({
  bookingId: z.string().uuid(),
});

export const listMyBookingsQuerySchema = z.object({
  status,
  cursor,
  limit,
});

export const listBookingsQuerySchema = z
  .object({
    staffId: z.string().uuid().optional(),
    status,
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    cursor,
    limit,
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.to <= value.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'to must be after from',
        path: ['to'],
      });
    }
  });

export const agendaQuerySchema = z
  .object({
    from: isoDateTime,
    to: isoDateTime,
    staffId: z.string().uuid().optional(),
    includeCancelled: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default('false'),
  })
  .superRefine((value, ctx) => {
    if (value.to <= value.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'to must be after from',
        path: ['to'],
      });
    }

    if (value.to.getTime() - value.from.getTime() > 31 * 86_400_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agenda range cannot exceed 31 days',
        path: ['to'],
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type IdempotencyHeaders = z.infer<typeof idempotencyHeadersSchema>;
export type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type AgendaQuery = z.infer<typeof agendaQuerySchema>;
