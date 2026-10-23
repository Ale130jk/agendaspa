import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate({ body: registerSchema }), registerHandler);
authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', authenticate, meHandler);
