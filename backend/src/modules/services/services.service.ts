import type { Role, Service } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { prisma } from '../../lib/prisma';
import { invalidateServiceAvailability } from '../availability/availability.cache';
import {
  createService,
  deactivateService,
  findServiceById,
  listServices,
  updateService,
} from './services.repository';
import type { CreateServiceInput, ListServicesQuery, UpdateServiceInput } from './services.schemas';

export function getServices(query: ListServicesQuery, role: Role | undefined): Promise<Service[]> {
  if (query.includeInactive && role !== 'ADMIN') {
    throw new ForbiddenError('AUTH_FORBIDDEN', 'Only administrators can list inactive services');
  }

  return listServices(!query.includeInactive);
}

export async function getService(id: string, role: Role | undefined): Promise<Service> {
  const service = await findServiceById(id);

  if (!service || (!service.isActive && role !== 'ADMIN')) {
    throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found');
  }

  return service;
}

export async function createServiceForAdmin(input: CreateServiceInput): Promise<Service> {
  try {
    return await createService({
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
    });
  } catch (error) {
    if (isUniqueNameError(error)) {
      throw new ConflictError('SERVICE_NAME_TAKEN', 'A service with this name already exists');
    }
    throw error;
  }
}

export async function updateServiceForAdmin(
  id: string,
  input: UpdateServiceInput,
): Promise<Service> {
  const existing = await findServiceById(id);
  if (!existing) {
    throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found');
  }

  try {
    const updated = await updateService(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    await invalidateServiceAvailability(id);
    return updated;
  } catch (error) {
    if (isUniqueNameError(error)) {
      throw new ConflictError('SERVICE_NAME_TAKEN', 'A service with this name already exists');
    }
    throw error;
  }
}

export async function deleteServiceForAdmin(id: string): Promise<void> {
  const existing = await findServiceById(id);
  if (!existing) {
    throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found');
  }

  await deactivateService(id);
  await invalidateServiceAvailability(id);
}

export function assertServicesExist(ids: string[]): Promise<void> {
  return prisma.service
    .findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    })
    .then((services) => {
      if (services.length !== new Set(ids).size) {
        throw new NotFoundError('SERVICE_NOT_FOUND', 'One or more services were not found');
      }
    });
}

function isUniqueNameError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
