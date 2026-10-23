import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError, isExclusionViolation, NotFoundError } from '../errors/app-error';

interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

interface BodyParserError extends SyntaxError {
  type?: string;
  status?: number;
}

function isJsonParseError(error: unknown): error is BodyParserError {
  return (
    error instanceof SyntaxError &&
    (error as BodyParserError).type === 'entity.parse.failed' &&
    (error as BodyParserError).status === 400
  );
}

function payload(req: Request, code: string, message: string, details?: unknown): ErrorPayload {
  const body: ErrorPayload = {
    error: {
      code,
      message,
      requestId: String(req.id),
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  return body;
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res
      .status(422)
      .json(payload(req, 'VALIDATION_ERROR', 'Request validation failed', error.flatten()));
    return;
  }

  if (isJsonParseError(error)) {
    res.status(400).json(payload(req, 'INVALID_JSON', 'Request body is not valid JSON'));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json(payload(req, error.code, error.message, error.details));
    return;
  }

  if (isExclusionViolation(error)) {
    res.status(409).json(payload(req, 'SLOT_TAKEN', 'The selected slot is no longer available'));
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json(payload(req, 'CONFLICT', 'The resource already exists'));
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json(payload(req, 'NOT_FOUND', 'The resource was not found'));
      return;
    }
  }

  logger.error({ err: error, requestId: String(req.id) }, 'Unhandled request error');

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : String(error);

  res.status(500).json(payload(req, 'INTERNAL_ERROR', message));
};
