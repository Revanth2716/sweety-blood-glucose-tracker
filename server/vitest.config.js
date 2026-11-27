import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Starting the embedded PGlite database takes a moment on the first run.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
