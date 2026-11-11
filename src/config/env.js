import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1).optional(),
    TEST_DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    CORS_ORIGIN: z.string().default('*'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  })
  .superRefine((env, ctx) => {
    // Tests wipe tables, so they must never fall back to the main database.
    const key = env.NODE_ENV === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
    if (!env[key]) {
      ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required` });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('See .env.example for the required variables.');
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  isDevelopment: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
  databaseUrl: data.NODE_ENV === 'test' ? data.TEST_DATABASE_URL : data.DATABASE_URL,
  corsOrigin:
    data.CORS_ORIGIN.trim() === '*'
      ? '*'
      : data.CORS_ORIGIN.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
};
