import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      BCRYPT_ROUNDS: '4', // keep password hashing fast in tests
    },
    setupFiles: ['tests/setup.js'],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
