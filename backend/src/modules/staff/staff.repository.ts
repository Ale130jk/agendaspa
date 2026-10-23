import { Prisma, type TimeOff } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { ListStaffQuery } from './staff.schemas';

export const staffInclude = {
  user: { select: { fullName: true, email: true, phone: true, isActive: true } },
  staffServices: { include: { service: true } },
} satisfies Prisma.StaffProfileInclude;

export type StaffWithRelations = Prisma.StaffProfileGetPayload<{
  include: typeof staffInclude;
}>;

export function listStaffProfiles(query: ListStaffQuery): Promise<StaffWithRelations[]> {
  return prisma.staffProfile.findMany({
    where: {
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.serviceId ? { staffServices: { some: { serviceId: query.serviceId } } } : {}),
    },
    include: staffInclude,
    orderBy: { user: { fullName: 'asc' } },
  });
}

export function findStaffProfile(id: string): Promise<StaffWithRelations | null> {
  return prisma.staffProfile.findUnique({ where: { id }, include: staffInclude });
}

export function findStaffProfileByUserId(userId: string): Promise<StaffWithRelations | null> {
  return prisma.staffProfile.findUnique({ where: { userId }, include: staffInclude });
}

export function findWorkingHours(staffId: string) {
  return prisma.workingHours.findMany({
    where: { staffId },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  });
}

export function findTimeOff(staffId: string): Promise<TimeOff[]> {
  return prisma.timeOff.findMany({
    where: { staffId },
    orderBy: { startAt: 'asc' },
    take: 200,
  });
}

export function findTimeOffById(staffId: string, timeOffId: string): Promise<TimeOff | null> {
  return prisma.timeOff.findFirst({ where: { id: timeOffId, staffId } });
}

export function countFutureBookings(staffId: string): Promise<number> {
  return prisma.booking.count({
    where: {
      staffId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      endAt: { gte: new Date() },
    },
  });
}
