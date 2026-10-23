import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';
import { UnauthorizedError } from '../../errors/app-error';
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBookingForClient,
  getAgenda,
  getBookingForActor,
  listBookingsForActor,
  listMyBookings,
} from './bookings.service';
import type {
  AgendaQuery,
  BookingIdParams,
  CreateBookingInput,
  IdempotencyHeaders,
  ListBookingsQuery,
  ListMyBookingsQuery,
} from './bookings.schemas';

function actorFrom(req: Request): {
  id: string;
  role: Parameters<typeof getBookingForActor>[0]['role'];
} {
  if (!req.user) {
    throw new UnauthorizedError('AUTH_REQUIRED', 'Authentication is required');
  }
  return req.user;
}

export const createBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actorFrom(req);
  const headers = req.validatedHeaders as IdempotencyHeaders;
  const result = await createBookingForClient(
    user.id,
    req.body as CreateBookingInput,
    headers['idempotency-key'],
  );

  res.status(result.replayed ? 200 : 201).json({
    booking: result.booking,
    replayed: result.replayed === true,
  });
});

export const getBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.validatedParams as BookingIdParams;
  const booking = await getBookingForActor(actorFrom(req), bookingId);
  res.status(200).json({ booking });
});

export const confirmBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.validatedParams as BookingIdParams;
  const booking = await confirmBooking(actorFrom(req), bookingId);
  res.status(200).json({ booking });
});

export const cancelBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.validatedParams as BookingIdParams;
  const booking = await cancelBooking(actorFrom(req), bookingId);
  res.status(200).json({ booking });
});

export const completeBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.validatedParams as BookingIdParams;
  const booking = await completeBooking(actorFrom(req), bookingId);
  res.status(200).json({ booking });
});

export const listMyBookingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actorFrom(req);
  const result = await listMyBookings(user.id, req.validatedQuery as ListMyBookingsQuery);
  res.status(200).json(result);
});

export const listBookingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listBookingsForActor(
    actorFrom(req),
    req.validatedQuery as ListBookingsQuery,
  );
  res.status(200).json(result);
});

export const getAgendaHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAgenda(actorFrom(req), req.validatedQuery as AgendaQuery);
  res.status(200).json(result);
});
