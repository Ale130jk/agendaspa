import { z } from 'zod';

export const serviceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listServicesQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default('false'),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(15).max(480),
  priceCents: z.number().int().min(0).max(10_000_000),
});

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
    priceCents: z.number().int().min(0).max(10_000_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ServiceIdParams = z.infer<typeof serviceIdParamsSchema>;
