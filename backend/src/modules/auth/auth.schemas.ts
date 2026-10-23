import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);

const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
