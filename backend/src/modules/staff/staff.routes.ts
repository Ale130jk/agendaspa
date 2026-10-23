import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createStaffHandler,
  createTimeOffHandler,
  deleteTimeOffHandler,
  getStaffHandler,
  getTimeOffHandler,
  getWorkingHoursHandler,
  listStaffHandler,
  replaceWorkingHoursHandler,
  updateStaffHandler,
} from './staff.controller';
import {
  createStaffSchema,
  createTimeOffSchema,
  listStaffQuerySchema,
  replaceWorkingHoursSchema,
  staffIdParamsSchema,
  timeOffParamsSchema,
  updateStaffSchema,
} from './staff.schemas';

export const staffRouter = Router();

staffRouter.get(
  '/',
  optionalAuthenticate,
  validate({ query: listStaffQuerySchema }),
  listStaffHandler,
);
staffRouter.get(
  '/:staffId',
  optionalAuthenticate,
  validate({ params: staffIdParamsSchema }),
  getStaffHandler,
);
staffRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createStaffSchema }),
  createStaffHandler,
);
staffRouter.patch(
  '/:staffId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: staffIdParamsSchema, body: updateStaffSchema }),
  updateStaffHandler,
);
staffRouter.get(
  '/:staffId/working-hours',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: staffIdParamsSchema }),
  getWorkingHoursHandler,
);
staffRouter.put(
  '/:staffId/working-hours',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: staffIdParamsSchema, body: replaceWorkingHoursSchema }),
  replaceWorkingHoursHandler,
);
staffRouter.get(
  '/:staffId/time-off',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: staffIdParamsSchema }),
  getTimeOffHandler,
);
staffRouter.post(
  '/:staffId/time-off',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: staffIdParamsSchema, body: createTimeOffSchema }),
  createTimeOffHandler,
);
staffRouter.delete(
  '/:staffId/time-off/:timeOffId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: timeOffParamsSchema }),
  deleteTimeOffHandler,
);
