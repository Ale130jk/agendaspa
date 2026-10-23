import type { Role, TimeOff } from '@prisma/client';
import { invalidateAvailability } from '../availability/availability.cache';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { assertServicesExist } from '../services/services.service';
import {
  countFutureBookings,
  findStaffProfile,
  findTimeOff,
  findTimeOffById,
  findWorkingHours,
  listStaffProfiles,
  type StaffWithRelations,
} from './staff.repository';
import type {
  CreateStaffInput,
  CreateTimeOffInput,
  ListStaffQuery,
  ReplaceWorkingHoursInput,
  UpdateStaffInput,
} from './staff.schemas';

interface StaffView {
  id: string;
  fullName: string;
  email?: string;
  phone?: string | null;
  bio: string | null;
  isActive: boolean;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  }>;
}

function presentStaff(staff: StaffWithRelations, includeEmail: boolean): StaffView {
  return {
    id: staff.id,
    fullName: staff.user.fullName,
    ...(includeEmail ? { email: staff.user.email, phone: staff.user.phone } : {}),
    bio: staff.bio,
    isActive: staff.isActive,
    services: staff.staffServices.map(({ service }) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    })),
  };
}

export async function getStaffMembers(
  query: ListStaffQuery,
  role: Role | undefined,
): Promise<StaffView[]> {
  if (query.includeInactive && role !== 'ADMIN') {
    throw new ForbiddenError('AUTH_FORBIDDEN', 'Only administrators can list inactive staff');
  }

  const staff = await listStaffProfiles(query);
  return staff.map((member) => presentStaff(member, role === 'ADMIN'));
}

export async function getStaffMember(id: string, role: Role | undefined): Promise<StaffView> {
  const staff = await findStaffProfile(id);

  if (!staff || (!staff.isActive && role !== 'ADMIN')) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  return presentStaff(staff, role === 'ADMIN');
}

export async function createStaffMember(input: CreateStaffInput): Promise<StaffView> {
  const serviceIds = [...new Set(input.serviceIds)];
  await assertServicesExist(serviceIds);
  const passwordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role: 'STAFF',
        },
        select: { id: true },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          bio: input.bio ?? null,
        },
        select: { id: true },
      });

      if (serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: serviceIds.map((serviceId) => ({
            staffId: profile.id,
            serviceId,
          })),
        });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw error;
  }

  const created = await prisma.staffProfile.findFirst({
    where: { user: { email: input.email } },
    include: {
      user: { select: { fullName: true, email: true, phone: true, isActive: true } },
      staffServices: { include: { service: true } },
    },
  });

  if (!created) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member could not be created');
  }

  return presentStaff(created, true);
}

export async function updateStaffMember(id: string, input: UpdateStaffInput): Promise<StaffView> {
  const existing = await findStaffProfile(id);
  if (!existing) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  const serviceIds = input.serviceIds ? [...new Set(input.serviceIds)] : undefined;
  if (serviceIds) {
    await assertServicesExist(serviceIds);
  }

  if (input.isActive === false && existing.isActive) {
    const futureBookings = await countFutureBookings(id);
    if (futureBookings > 0) {
      throw new ConflictError(
        'STAFF_HAS_ACTIVE_BOOKINGS',
        'Cancel future bookings before deactivating this staff member',
      );
    }
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  await prisma.$transaction(async (tx) => {
    const userData = {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };

    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: existing.userId }, data: userData });
    }

    const profileData = {
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };

    if (Object.keys(profileData).length > 0) {
      await tx.staffProfile.update({ where: { id }, data: profileData });
    }

    if (serviceIds !== undefined) {
      await tx.staffService.deleteMany({ where: { staffId: id } });
      if (serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: serviceIds.map((serviceId) => ({ staffId: id, serviceId })),
        });
      }
    }
  });

  await invalidateAvailability(id);

  const updated = await findStaffProfile(id);
  if (!updated) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  return presentStaff(updated, true);
}

export async function getStaffWorkingHours(id: string) {
  const staff = await findStaffProfile(id);
  if (!staff) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }
  return findWorkingHours(id);
}

export async function replaceStaffWorkingHours(id: string, input: ReplaceWorkingHoursInput) {
  const staff = await findStaffProfile(id);
  if (!staff) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { staffId: id } });
    if (input.hours.length > 0) {
      await tx.workingHours.createMany({
        data: input.hours.map((hour) => ({ staffId: id, ...hour })),
      });
    }
  });

  await invalidateAvailability(id);
  return findWorkingHours(id);
}

export async function getStaffTimeOff(id: string): Promise<TimeOff[]> {
  const staff = await findStaffProfile(id);
  if (!staff) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }
  return findTimeOff(id);
}

export async function createStaffTimeOff(id: string, input: CreateTimeOffInput): Promise<TimeOff> {
  const staff = await findStaffProfile(id);
  if (!staff) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  if (input.endAt <= new Date()) {
    throw new ConflictError('TIME_OFF_IN_PAST', 'Time off must end in the future');
  }

  const [overlappingTimeOff, overlappingBookings] = await Promise.all([
    prisma.timeOff.findFirst({
      where: {
        staffId: id,
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
      },
      select: { id: true },
    }),
    prisma.booking.findFirst({
      where: {
        staffId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
      },
      select: { id: true },
    }),
  ]);

  if (overlappingTimeOff) {
    throw new ConflictError('TIME_OFF_OVERLAP', 'This time off overlaps an existing absence');
  }

  if (overlappingBookings) {
    throw new ConflictError(
      'TIME_OFF_CONFLICTS_BOOKINGS',
      'This time off overlaps an active booking',
    );
  }

  const timeOff = await prisma.timeOff.create({
    data: {
      staffId: id,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason ?? null,
    },
  });

  await invalidateAvailability(id);
  return timeOff;
}

export async function deleteStaffTimeOff(id: string, timeOffId: string): Promise<void> {
  const staff = await findStaffProfile(id);
  if (!staff) {
    throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
  }

  const timeOff = await findTimeOffById(id, timeOffId);
  if (!timeOff) {
    throw new NotFoundError('TIME_OFF_NOT_FOUND', 'Time off not found');
  }

  await prisma.timeOff.delete({ where: { id: timeOffId } });
  await invalidateAvailability(id);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
