import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';
import { UnauthorizedError } from '../../errors/app-error';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from '../../lib/cookies';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { getCurrentUser, login, logout, register, rotateRefreshToken } from './auth.service';

function setSessionCookie(
  res: Response,
  session: { refreshToken: string; refreshExpiresAt: Date },
): void {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await register(req.body as RegisterInput);
  setSessionCookie(res, session);
  res.status(201).json({ accessToken: session.accessToken, user: session.user });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await login(req.body as LoginInput);
  setSessionCookie(res, session);
  res.status(200).json({ accessToken: session.accessToken, user: session.user });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (!rawToken) {
    throw new UnauthorizedError('AUTH_REFRESH_MISSING', 'Refresh token is missing');
  }

  const session = await rotateRefreshToken(rawToken);
  setSessionCookie(res, session);
  res.status(200).json({ accessToken: session.accessToken, user: session.user });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await logout(rawToken);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('AUTH_REQUIRED', 'Authentication is required');
  }

  const user = await getCurrentUser(req.user.id);
  res.status(200).json({ user });
});
