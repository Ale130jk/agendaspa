import type { Prisma, Service } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export function listServices(activeOnly: boolean): Promise<Service[]> {
  return prisma.service.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export function findServiceById(id: string): Promise<Service | null> {
  return prisma.service.findUnique({ where: { id } });
}

export function findServicesByIds(ids: string[]): Promise<Service[]> {
  return prisma.service.findMany({ where: { id: { in: ids } } });
}

export function createService(data: Prisma.ServiceCreateInput): Promise<Service> {
  return prisma.service.create({ data });
}

export function updateService(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
  return prisma.service.update({ where: { id }, data });
}

export function deactivateService(id: string): Promise<Service> {
  return prisma.service.update({ where: { id }, data: { isActive: false } });
}
