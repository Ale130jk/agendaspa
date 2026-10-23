import { createClient, type RedisClientType } from 'redis';
import { logger } from '../config/logger';
import { env } from '../config/env';

let client: RedisClientType | undefined;
let connecting: Promise<RedisClientType> | undefined;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Redis timeout')), ms);
      timer.unref();
    }),
  ]);
}

export async function getRedis(): Promise<RedisClientType> {
  if (client?.isReady) {
    return client;
  }

  if (!client) {
    client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 100, 1_000)),
      },
    });
    client.on('error', (error) => {
      logger.warn({ err: error }, 'Redis client error');
    });
  }

  if (!connecting) {
    connecting = client
      .connect()
      .then(() => client as RedisClientType)
      .finally(() => {
        connecting = undefined;
      });
  }

  return connecting;
}

export async function pingRedis(timeoutMs = 1_000): Promise<void> {
  const redis = await withTimeout(getRedis(), timeoutMs);
  await withTimeout(redis.ping(), timeoutMs);
}

export async function closeRedis(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    if (client.isOpen) {
      await client.quit();
    } else {
      client.disconnect();
    }
  } finally {
    client = undefined;
    connecting = undefined;
  }
}
