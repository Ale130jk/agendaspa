import type { Role } from '@prisma/client';

export interface UserForPresenter {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  staffProfile?: { id: string } | null;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  staffId: string | null;
}

export function presentUser(user: UserForPresenter): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    staffId: user.staffProfile?.id ?? null,
  };
}

export const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  staffProfile: { select: { id: true } },
} as const;
