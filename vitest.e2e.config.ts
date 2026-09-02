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
    // Several specs drive real socket.io round-trips through e2e.setup.ts's `server.emit`/
    // `httpWithBroadcast`/etc helpers, whose own internal timeout defaults to 5000ms
    // (DEFAULT_SOCKET_TIMEOUT_MS). Vitest's default `testTimeout` is also 5000ms, so the two
    // raced: the test runner could abandon the test at the same moment the helper's own timer
    // was about to fire, leaving a dangling socket/timer whose later rejection surfaced as an
    // unhandled error that crashed the forked worker process, not just failed the one test.
    // Jest's default is the same 5000ms but didn't hit this - its per-file cold-start (module
    // resolution, decorator metadata) is cheaper than Vite/SWC's, leaving more real headroom
    // inside the nominal 5s. Giving the test timeout real headroom over the helpers' own 5s
    // timeout lets that internal timeout fire and reject cleanly first, as intended.
    testTimeout: 15000,
  },
});
