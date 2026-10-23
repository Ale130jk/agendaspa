process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://agendaspa:agendaspa_dev_password@localhost:5432/agendaspa_test?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-change-me-32';
process.env.LOG_LEVEL = 'silent';
process.env.COOKIE_SECURE = 'false';
process.env.SPA_TIMEZONE = 'America/Lima';
process.env.CURRENCY = 'PEN';
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.BOOKING_RATE_LIMIT_MAX = '10000';
process.env.SEED_DEMO = 'false';
