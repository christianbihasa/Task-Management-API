import { z } from 'zod';

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(255, 'Email must be at most 255 characters')
  .pipe(z.email('Invalid email address'));

export const registerSchema = z.strictObject({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    // bcrypt only uses the first 72 bytes of a password.
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export const loginSchema = z.strictObject({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});
