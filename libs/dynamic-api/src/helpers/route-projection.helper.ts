import { ProjectionType } from 'mongoose';
import { RouteProjection } from '../interfaces';

/**
 * Resolves a route's `projection` option to the Mongoose projection to apply for this caller:
 * a function is called with `user`, a static projection is returned as is.
 * @internal Not part of the public API.
 */
function resolveRouteProjection<Entity>(
  projection: RouteProjection<Entity> | undefined,
  user: unknown,
): ProjectionType<Entity> | undefined {
  return typeof projection === 'function' ? projection(user) : projection;
}

export { resolveRouteProjection };
