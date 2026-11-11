import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Slows down brute-force attempts on login/register: 10 requests per 15 minutes per IP. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many attempts, please try again later'));
  },
});
