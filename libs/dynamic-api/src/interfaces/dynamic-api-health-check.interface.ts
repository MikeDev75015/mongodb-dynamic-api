/**
 * Options passed to `DynamicApiHealthModule.register()`.
 */
interface DynamicApiHealthCheckOptions {
  /**
   * Path the health endpoint is mounted at (relative, no leading slash).
   * @default 'health'
   */
  path?: string;
}

/** Shape of the `GET /<path>` health-check HTTP response, on both the 200 and 503 branches. */
interface DynamicApiHealthCheckResponse {
  status: 'ok' | 'error';
  mongo: 'up' | 'down';
}

export type { DynamicApiHealthCheckOptions, DynamicApiHealthCheckResponse };
