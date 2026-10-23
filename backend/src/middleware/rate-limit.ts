import type { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

function limitHandler(req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Try again later.',
      requestId: String(req.id),
    },
  });
}

export const globalRateLimiter = rateLimit({
  windowMs,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
  handler: limitHandler,
});

export const authRateLimiter = rateLimit({
  windowMs,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
  handler: limitHandler,
});

export const bookingRateLimiter = rateLimit({
  windowMs,
  limit: env.BOOKING_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  handler: limitHandler,
});
