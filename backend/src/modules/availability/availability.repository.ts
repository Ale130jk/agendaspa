import { prisma } from '../../lib/prisma';

export function findAvailabilityContext(serviceId: string, staffId: string) {
  return Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.staffProfile.findUnique({
      where: { id: staffId },
      include: { user: { select: { fullName: true, isActive: true } } },
    }),
    prisma.staffService.findUnique({
      where: { staffId_serviceId: { staffId, serviceId } },
    }),
  ]);
}

export function findWorkingHours(staffId: string, weekday: number) {
  return prisma.workingHours.findMany({
    where: { staffId, weekday },
    orderBy: { startMinute: 'asc' },
  });
}

export function findTimeOff(staffId: string, from: Date, to: Date) {
  return prisma.timeOff.findMany({
    where: { staffId, startAt: { lt: to }, endAt: { gt: from } },
    select: { startAt: true, endAt: true },
  });
}

export function findActiveBookings(staffId: string, from: Date, to: Date) {
  return prisma.booking.findMany({
    where: {
      staffId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: { startAt: true, endAt: true },
  });
}

export function findStaffIdsForService(serviceId: string): Promise<string[]> {
  return prisma.staffService
    .findMany({ where: { serviceId }, select: { staffId: true } })
    .then((rows) => rows.map((row) => row.staffId));
}
