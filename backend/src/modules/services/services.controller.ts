import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';
import {
  createServiceForAdmin,
  deleteServiceForAdmin,
  getService,
  getServices,
  updateServiceForAdmin,
} from './services.service';
import type {
  CreateServiceInput,
  ListServicesQuery,
  ServiceIdParams,
  UpdateServiceInput,
} from './services.schemas';

export const listServicesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validatedQuery as ListServicesQuery;
  const services = await getServices(query, req.user?.role);
  res.status(200).json({ data: services });
});

export const getServiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as ServiceIdParams;
  const service = await getService(id, req.user?.role);
  res.status(200).json({ service });
});

export const createServiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const service = await createServiceForAdmin(req.body as CreateServiceInput);
  res.status(201).json({ service });
});

export const updateServiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as ServiceIdParams;
  const service = await updateServiceForAdmin(id, req.body as UpdateServiceInput);
  res.status(200).json({ service });
});

export const deleteServiceHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as ServiceIdParams;
  await deleteServiceForAdmin(id);
  res.status(204).send();
});
