import { z } from 'zod';

export const staffIdParamsSchema = z.object({
  staffId: z.string().uuid(),
});

export const timeOffParamsSchema = z.object({
  staffId: z.string().uuid(),
  timeOffId: z.string().uuid(),
});

export const listStaffQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default('false'),
});

export const createStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30).optional(),
  bio: z.string().trim().max(1000).optional(),
  serviceIds: z.array(z.string().uuid()).max(50).default([]),
});

export const updateStaffSchema = z
  .object({
    password: z.string().min(8).max(128).optional(),
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(6).max(30).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
    serviceIds: z.array(z.string().uuid()).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const workingHourSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});

export const replaceWorkingHoursSchema = z.object({
  hours: z
    .array(workingHourSchema)
    .max(21)
    .superRefine((hours, ctx) => {
      const byWeekday = new Map<number, Array<{ startMinute: number; endMinute: number }>>();

      for (const hour of hours) {
        if (hour.endMinute <= hour.startMinute) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'endMinute must be greater than startMinute',
          });
          continue;
        }

        const list = byWeekday.get(hour.weekday) ?? [];
        list.push({ startMinute: hour.startMinute, endMinute: hour.endMinute });
        byWeekday.set(hour.weekday, list);
      }

      for (const list of byWeekday.values()) {
        list.sort((a, b) => a.startMinute - b.startMinute);
        for (let index = 1; index < list.length; index += 1) {
          const previous = list[index - 1];
          const current = list[index];
          if (previous && current && current.startMinute < previous.endMinute) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Working hour intervals cannot overlap on the same weekday',
            });
          }
        }
      }
    }),
});

export const createTimeOffSchema = z
  .object({
    startAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    endAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.endAt > value.startAt, {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export type StaffIdParams = z.infer<typeof staffIdParamsSchema>;
export type TimeOffParams = z.infer<typeof timeOffParamsSchema>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ReplaceWorkingHoursInput = z.infer<typeof replaceWorkingHoursSchema>;
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;
