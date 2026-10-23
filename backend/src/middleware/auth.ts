import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';
import { verifyAccessToken } from '../lib/tokens';

export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }
  authenticate(req, res, next);
};

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('AUTH_REQUIRED', 'Authentication is required'));
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('AUTH_INVALID_TOKEN', 'Access token is invalid or expired'));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError('AUTH_REQUIRED', 'Authentication is required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('AUTH_FORBIDDEN', 'You do not have permission for this action'));
      return;
    }

    next();
  };
}
