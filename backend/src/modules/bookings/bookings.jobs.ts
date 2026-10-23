import { logger } from '../../config/logger';
import { expirePendingBookings } from './bookings.service';

const DEFAULT_INTERVAL_MS = 60_000;

export function startPendingBookingExpiryJob(intervalMs = DEFAULT_INTERVAL_MS): () => void {
  const run = (): void => {
    void expirePendingBookings()
      .then((count) => {
        if (count > 0) {
          logger.info({ count }, 'Expired pending bookings');
        }
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Pending booking expiry job failed');
      });
  };

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();

  return () => clearInterval(timer);
}
