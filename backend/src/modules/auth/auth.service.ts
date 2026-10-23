import type { Role } from '@prisma/client';
import { ConflictError, UnauthorizedError } from '../../errors/app-error';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { createRefreshToken, hashToken, signAccessToken } from '../../lib/tokens';
import { presentUser, userSelect, type PublicUser } from '../users/user.presenter';
import type { LoginInput, RegisterInput } from './auth.schemas';

const DUMMY_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$XEHOliTygLVbOqjCWNHU2Q$cDveNQzTqbLQdvRr7WSsAL2LGMGP/Ko8lBNb/KPKVdU';

interface SessionResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

interface UserForAuth {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  staffProfile?: { id: string } | null;
}

function assertActive(user: UserForAuth): void {
  if (!user.isActive) {
    throw new UnauthorizedError('AUTH_ACCOUNT_DISABLED', 'This account is disabled');
  }
}

async function createSession(user: UserForAuth, familyId?: string): Promise<SessionResult> {
  const refresh = createRefreshToken(familyId);
  const accessToken = signAccessToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      familyId: refresh.familyId,
      expiresAt: refresh.expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refresh.raw,
    refreshExpiresAt: refresh.expiresAt,
    user: presentUser(user),
  };
}

export async function register(input: RegisterInput): Promise<SessionResult> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? null,
        role: 'CLIENT',
      },
      select: { ...userSelect, isActive: true },
    });

    return createSession(user);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<SessionResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...userSelect, passwordHash: true },
  });

  if (!user) {
    await verifyPassword(DUMMY_HASH, input.password);
    throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  assertActive(user);

  return createSession(user);
}

export async function rotateRefreshToken(rawToken: string): Promise<SessionResult> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { ...userSelect, isActive: true },
      },
    },
  });

  if (!stored) {
    throw new UnauthorizedError('AUTH_INVALID_REFRESH', 'Refresh token is invalid');
  }

  if (stored.revokedAt) {
    await revokeFamily(stored.familyId);
    throw new UnauthorizedError(
      'AUTH_REFRESH_REUSED',
      'Refresh token reuse detected. Please sign in again.',
    );
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    await revokeFamily(stored.familyId);
    throw new UnauthorizedError('AUTH_REFRESH_EXPIRED', 'Refresh token has expired');
  }

  assertActive(stored.user);

  const next = createRefreshToken(stored.familyId);

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (claimed.count !== 1) {
        throw new RefreshReuseError();
      }

      const created = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: next.hash,
          familyId: next.familyId,
          expiresAt: next.expiresAt,
        },
      });

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { replacedByTokenId: created.id },
      });
    });
  } catch (error) {
    if (error instanceof RefreshReuseError) {
      await revokeFamily(stored.familyId);
      throw new UnauthorizedError(
        'AUTH_REFRESH_REUSED',
        'Refresh token reuse detected. Please sign in again.',
      );
    }
    throw error;
  }

  return {
    accessToken: signAccessToken(stored.user),
    refreshToken: next.raw,
    refreshExpiresAt: next.expiresAt,
    user: presentUser(stored.user),
  };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) {
    return;
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { familyId: true },
  });

  if (stored) {
    await revokeFamily(stored.familyId);
  }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...userSelect, isActive: true },
  });

  if (!user) {
    throw new UnauthorizedError('AUTH_USER_NOT_FOUND', 'User no longer exists');
  }

  assertActive(user);
  return presentUser(user);
}

async function revokeFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

class RefreshReuseError extends Error {}
