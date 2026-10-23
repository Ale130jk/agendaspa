import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPair {
  raw: string;
  hash: string;
  familyId: string;
  expiresAt: Date;
}

export function signAccessToken(user: { id: string; role: Role }): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    issuer: 'agendaspa',
    audience: 'agendaspa-web',
  };

  return jwt.sign({ role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    ...options,
    subject: user.id,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'agendaspa',
    audience: 'agendaspa-web',
  });

  if (
    typeof payload === 'string' ||
    payload.type !== 'access' ||
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }

  return payload as AccessTokenPayload;
}

export function createRefreshToken(
  familyId: string = randomUUID(),
  now = new Date(),
): RefreshTokenPair {
  const raw = randomBytes(64).toString('base64url');
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);

  return {
    raw,
    hash: hashToken(raw),
    familyId,
    expiresAt,
  };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
