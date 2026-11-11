import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

export function signAccessToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });
}

/** Returns the decoded payload, or throws a jsonwebtoken error. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}
