import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { bookingRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import {
  cancelBookingHandler,
  completeBookingHandler,
  confirmBookingHandler,
  createBookingHandler,
  getBookingHandler,
  listBookingsHandler,
  listMyBookingsHandler,
} from './bookings.controller';
import {
  bookingIdParamsSchema,
  createBookingSchema,
  idempotencyHeadersSchema,
  listBookingsQuerySchema,
  listMyBookingsQuerySchema,
} from './bookings.schemas';

export const bookingsRouter = Router();

bookingsRouter.post(
  '/',
  authenticate,
  requireRole('CLIENT'),
  bookingRateLimiter,
  validate({ headers: idempotencyHeadersSchema, body: createBookingSchema }),
  createBookingHandler,
);
bookingsRouter.get(
  '/me',
  authenticate,
  requireRole('CLIENT'),
  validate({ query: listMyBookingsQuerySchema }),
  listMyBookingsHandler,
);
bookingsRouter.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate({ query: listBookingsQuerySchema }),
  listBookingsHandler,
);
bookingsRouter.get(
  '/:bookingId',
  authenticate,
  validate({ params: bookingIdParamsSchema }),
  getBookingHandler,
);
bookingsRouter.post(
  '/:bookingId/confirm',
  authenticate,
  requireRole('CLIENT', 'ADMIN'),
  validate({ params: bookingIdParamsSchema }),
  confirmBookingHandler,
);
bookingsRouter.post(
  '/:bookingId/cancel',
  authenticate,
  requireRole('CLIENT', 'ADMIN'),
  validate({ params: bookingIdParamsSchema }),
  cancelBookingHandler,
);
bookingsRouter.post(
  '/:bookingId/complete',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: bookingIdParamsSchema }),
  completeBookingHandler,
);
