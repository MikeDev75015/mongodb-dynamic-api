import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * E2E test config (mirrors libs/dynamic-api/test/jest-e2e.json).
 *
 * fileParallelism is forced off and pool is forced to 'forks': every *.e2e-spec.ts file in a
 * given CI container talks to the SAME real MongoDB instance (see .circleci/config.yml's
 * e2e-tests-mongodb-job — one `docker compose up` replica set per container, MONGO_DB_URL is
 * process-wide) and calls truncateMongoDb() between test app inits (test/e2e.setup.ts). Running
 * files concurrently would race on that shared database — this is a correctness requirement,
 * not a performance default, and mirrors why Jest ran these with --runInBand. 'forks' (separate
 * OS processes, like Jest's own worker model) is used instead of the default 'threads' pool
 * because each file boots a real NestJS HTTP server + live socket.io connections.
 */
export default defineConfig({
  // See vitest.config.ts for why this plugin is required (legacy decorators + decorator
  // metadata, which Vite 8's default Rolldown/oxc transform does not support).
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: { target: 'es2021' },
    }),
  ],
  test: {
    // No `globals: true` — see vitest.config.ts for why (e2e-spec files are part of the tsc
    // build, so explicit `from 'vitest'` imports are used instead of ambient globals).
    environment: 'node',
    include: ['libs/**/*.e2e-spec.ts'],
    clearMocks: true,
    mockReset: true,
    fileParallelism: false,
    pool: 'forks',
  },
});
