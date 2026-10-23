import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD'),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
