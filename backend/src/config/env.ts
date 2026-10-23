import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const timeZone = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IANA time zone' },
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  COOKIE_SECURE: booleanFromString.default('false'),
  SPA_TIMEZONE: timeZone.default('America/Lima'),
  CURRENCY: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default('PEN'),
  SLOT_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
  BOOKING_HORIZON_DAYS: z.coerce.number().int().positive().default(60),
  PENDING_BOOKING_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  CANCELLATION_WINDOW_HOURS: z.coerce.number().int().nonnegative().default(24),
  AVAILABILITY_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SEED_DEMO: booleanFromString.default('false'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@agendaspa.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  SEED_STAFF_EMAIL: z.string().email().default('lucia@agendaspa.local'),
  SEED_STAFF_PASSWORD: z.string().min(8).default('Staff123!'),
  SEED_CLIENT_EMAIL: z.string().email().default('cliente@agendaspa.local'),
  SEED_CLIENT_PASSWORD: z.string().min(8).default('Client123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  console.error('Invalid environment configuration', details);
  throw new Error('Invalid environment configuration');
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
