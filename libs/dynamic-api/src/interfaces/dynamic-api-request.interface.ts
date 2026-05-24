/**
 * Minimal typed HTTP request surface used in controller mixins.
 * Only `user` is required — the authenticated principal from the JWT guard.
 * All other request properties remain accessible via the concrete NestJS
 * `Request` object; this interface only types what the library itself reads.
 */
interface DynamicApiRequest {
  user?: unknown;
}

export type { DynamicApiRequest };

