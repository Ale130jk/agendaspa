import type { Role } from '@prisma/client';
import type { ReqId } from 'pino-http';

declare global {
  namespace Express {
    interface Request {
      id: ReqId;
      user?: {
        id: string;
        role: Role;
      };
      validatedQuery?: unknown;
      validatedParams?: unknown;
      validatedHeaders?: unknown;
    }
  }
}

export {};
