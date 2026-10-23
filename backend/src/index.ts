import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { closeRedis } from './lib/redis';
import { startPendingBookingExpiryJob } from './modules/bookings/bookings.jobs';

const app = createApp();
const stopExpiryJob = startPendingBookingExpiryJob();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'AgendaSpa API listening');
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  stopExpiryJob();

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await Promise.allSettled([closeRedis(), prisma.$disconnect()]);
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
