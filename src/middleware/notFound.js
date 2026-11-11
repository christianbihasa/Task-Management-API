import { AppError } from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
