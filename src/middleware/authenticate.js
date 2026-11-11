import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/** Requires `Authorization: Bearer <token>` and sets `req.user = { id }`. */
export function authenticate(req, _res, next) {
  const header = req.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Authentication token is missing', 'TOKEN_MISSING');
  }

  const token = header.slice('Bearer '.length).trim();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Authentication token is invalid', 'TOKEN_INVALID');
  }

  if (!payload.sub) {
    throw AppError.unauthorized('Authentication token is invalid', 'TOKEN_INVALID');
  }

  req.user = { id: payload.sub };
  next();
}
