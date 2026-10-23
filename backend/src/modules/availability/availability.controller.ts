import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';
import { getAvailability } from './availability.service';
import type { AvailabilityQuery } from './availability.schemas';

export const getAvailabilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId, staffId, date } = req.validatedQuery as AvailabilityQuery;
  const availability = await getAvailability(serviceId, staffId, date);
  res.status(200).json({ availability });
});
