import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { signAccessToken } from '../../utils/jwt.js';
import * as authRepository from './auth.repository.js';

const PG_UNIQUE_VIOLATION = '23505';

// Compared against when the email doesn't exist, so a failed login takes the same
// time either way and doesn't reveal which emails are registered.
let dummyHash;
async function getDummyHash() {
  dummyHash ??= await bcrypt.hash('dummy-password-for-timing', env.BCRYPT_ROUNDS);
  return dummyHash;
}

function buildAuthResponse(user) {
  return { user, token: signAccessToken(user.id) };
}

export async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const user = await authRepository.createUser({ name, email, passwordHash });
    return buildAuthResponse(user);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw AppError.conflict('Email is already registered');
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await authRepository.findUserByEmailWithPassword(email);
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.passwordHash : await getDummyHash(),
  );

  if (!user || !passwordMatches) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const { passwordHash: _omit, ...publicUser } = user;
  return buildAuthResponse(publicUser);
}

export async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    // The token is valid but the account no longer exists.
    throw AppError.unauthorized('User no longer exists', 'TOKEN_INVALID');
  }
  return user;
}
