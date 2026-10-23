import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getAgendaHandler } from './bookings.controller';
import { agendaQuerySchema } from './bookings.schemas';

export const agendaRouter = Router();

agendaRouter.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate({ query: agendaQuerySchema }),
  getAgendaHandler,
);
