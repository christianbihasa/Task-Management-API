import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { formatZodIssues } from '../utils/zod.js';

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERRORS = {
  23505: () => AppError.conflict('A record with this value already exists'),
  23503: () => AppError.badRequest('Referenced record does not exist'),
  23502: () => AppError.badRequest('A required field is missing'),
  23514: () => AppError.badRequest('A value failed a database check'),
  '22P02': () => AppError.badRequest('Invalid input format'),
  22001: () => AppError.badRequest('A value is too long'),
};

/** Converts any thrown value into an AppError. */
function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return AppError.validation(formatZodIssues(err));
  }

  // Errors raised by express.json() (body-parser).
  if (err?.type === 'entity.parse.failed') {
    return new AppError(400, 'INVALID_JSON', 'Request body contains invalid JSON');
  }
  if (err?.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (err?.name === 'TokenExpiredError') {
    return AppError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED');
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
    return AppError.unauthorized('Authentication token is invalid', 'TOKEN_INVALID');
  }

  if (typeof err?.code === 'string' && PG_ERRORS[err.code]) {
    return PG_ERRORS[err.code]();
  }

  // Other client errors from Express middleware (they set `status` and `expose`).
  if (err?.expose && err.status >= 400 && err.status < 500) {
    return new AppError(err.status, 'BAD_REQUEST', err.message);
  }

  const message = env.isProduction
    ? 'Something went wrong'
    : err?.message || 'Something went wrong';
  return new AppError(500, 'INTERNAL_ERROR', message);
}

// Express recognises error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  const appError = toAppError(err);

  if (appError.statusCode >= 500 && !env.isTest) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
    },
  };

  if (appError.details) body.error.details = appError.details;
  if (appError.statusCode >= 500 && env.isDevelopment && err?.stack) {
    body.error.stack = err.stack;
  }

  res.status(appError.statusCode).json(body);
}
