import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getAvailabilityHandler } from './availability.controller';
import { availabilityQuerySchema } from './availability.schemas';

export const availabilityRouter = Router();

availabilityRouter.get(
  '/',
  authenticate,
  validate({ query: availabilityQuerySchema }),
  getAvailabilityHandler,
);
