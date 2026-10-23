import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';
import {
  createStaffMember,
  createStaffTimeOff,
  deleteStaffTimeOff,
  getStaffMember,
  getStaffMembers,
  getStaffTimeOff,
  getStaffWorkingHours,
  replaceStaffWorkingHours,
  updateStaffMember,
} from './staff.service';
import type {
  CreateStaffInput,
  CreateTimeOffInput,
  ListStaffQuery,
  ReplaceWorkingHoursInput,
  StaffIdParams,
  TimeOffParams,
  UpdateStaffInput,
} from './staff.schemas';

export const listStaffHandler = asyncHandler(async (req: Request, res: Response) => {
  const staff = await getStaffMembers(req.validatedQuery as ListStaffQuery, req.user?.role);
  res.status(200).json({ data: staff });
});

export const getStaffHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const staff = await getStaffMember(staffId, req.user?.role);
  res.status(200).json({ staff });
});

export const createStaffHandler = asyncHandler(async (req: Request, res: Response) => {
  const staff = await createStaffMember(req.body as CreateStaffInput);
  res.status(201).json({ staff });
});

export const updateStaffHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const staff = await updateStaffMember(staffId, req.body as UpdateStaffInput);
  res.status(200).json({ staff });
});

export const getWorkingHoursHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const hours = await getStaffWorkingHours(staffId);
  res.status(200).json({ hours });
});

export const replaceWorkingHoursHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const hours = await replaceStaffWorkingHours(staffId, req.body as ReplaceWorkingHoursInput);
  res.status(200).json({ hours });
});

export const getTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const timeOff = await getStaffTimeOff(staffId);
  res.status(200).json({ data: timeOff });
});

export const createTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.validatedParams as StaffIdParams;
  const timeOff = await createStaffTimeOff(staffId, req.body as CreateTimeOffInput);
  res.status(201).json({ timeOff });
});

export const deleteTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId, timeOffId } = req.validatedParams as TimeOffParams;
  await deleteStaffTimeOff(staffId, timeOffId);
  res.status(204).send();
});
