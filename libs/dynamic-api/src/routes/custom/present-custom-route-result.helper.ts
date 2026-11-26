import { Mappable } from '../../interfaces';

/**
 * Maps a custom route handler's result through its presenter, the same way native routes do:
 *  - single response → `presenter.fromEntity(result)` when the presenter defines it;
 *  - `isArrayResponse` → `presenter.fromEntities(result, user)` when defined, else
 *    `presenter.fromEntity(item, user)` on every item (so a presenter written for a single
 *    document works on a list route without a dedicated `fromEntities`).
 *
 * Falls back to the raw handler result when the presenter exposes no usable mapper.
 * @internal Not part of the public API.
 */
function presentCustomRouteResult<Entity>(
  presenter: Mappable<Entity>,
  result: unknown,
  user: unknown,
  isArrayResponse: boolean | undefined,
): unknown {
  if (!isArrayResponse) {
    return presenter.fromEntity ? presenter.fromEntity(result as Entity) : result;
  }

  if (presenter.fromEntities) {
    return presenter.fromEntities(result as Entity[], user);
  }

  return presenter.fromEntity
    ? (result as Entity[]).map((entity) => presenter.fromEntity(entity, user))
    : result;
}

export { presentCustomRouteResult };
