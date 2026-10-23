import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export const REFRESH_COOKIE = 'refresh_token';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/api/auth',
};

export function setRefreshCookie(res: Response, rawToken: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, rawToken, {
    ...baseOptions,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}
