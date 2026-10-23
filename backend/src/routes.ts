import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { availabilityRouter } from './modules/availability/availability.routes';
import { agendaRouter } from './modules/bookings/agenda.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { servicesRouter } from './modules/services/services.routes';
import { staffRouter } from './modules/staff/staff.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/availability', availabilityRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/agenda', agendaRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/staff', staffRouter);
