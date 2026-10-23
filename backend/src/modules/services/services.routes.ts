import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createServiceHandler,
  deleteServiceHandler,
  getServiceHandler,
  listServicesHandler,
  updateServiceHandler,
} from './services.controller';
import {
  createServiceSchema,
  listServicesQuerySchema,
  serviceIdParamsSchema,
  updateServiceSchema,
} from './services.schemas';

export const servicesRouter = Router();

servicesRouter.get(
  '/',
  optionalAuthenticate,
  validate({ query: listServicesQuerySchema }),
  listServicesHandler,
);
servicesRouter.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: serviceIdParamsSchema }),
  getServiceHandler,
);
servicesRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createServiceSchema }),
  createServiceHandler,
);
servicesRouter.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: serviceIdParamsSchema, body: updateServiceSchema }),
  updateServiceHandler,
);
servicesRouter.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: serviceIdParamsSchema }),
  deleteServiceHandler,
);
