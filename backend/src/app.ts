import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openApiDocument } from './docs/openapi';
import { prisma } from './lib/prisma';
import { pingRedis } from './lib/redis';
import { globalRateLimiter } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,100}$/;

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
            ? incoming
            : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready',
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/ready', async (_req, res) => {
    let database = 'ok';
    let redis = 'ok';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    try {
      await pingRedis();
    } catch {
      redis = 'degraded';
    }

    const ready = database === 'ok';
    res.status(ready ? 200 : 503).json({
      status: ready ? (redis === 'ok' ? 'ready' : 'degraded') : 'not_ready',
      checks: { database, redis },
    });
  });

  app.use('/api', globalRateLimiter, apiRouter);
  app.get('/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'AgendaSpa API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
