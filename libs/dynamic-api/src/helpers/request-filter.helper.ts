import { BadRequestException } from '@nestjs/common';

type RequestFilter = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Throws a `400 BadRequest` when a client-supplied value (HTTP query, WebSocket payload) carries
 * a key starting with `$` at any depth. Such values end up as MongoDB filters, so a `$`-key would
 * let the client inject a query operator (`{ owner: { $ne: null } }`) instead of a plain value.
 * @internal Not part of the public API.
 */
function assertNoMongoOperators(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoMongoOperators);
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith('$')) {
      throw new BadRequestException(`Invalid filter key "${key}"`);
    }

    assertNoMongoOperators(nested);
  }
}

/**
 * Turns the client-supplied query (HTTP) or payload (WebSocket) of a route into the filter used to
 * load the documents an ability predicate is checked against:
 * - `ids` (DeleteMany / UpdateMany / DuplicateMany) becomes `{ _id: { $in: ids } }` — the other
 *   keys of an UpdateMany payload are the update itself, not a filter, so they are ignored;
 * - anything else is used as-is, once checked by `assertNoMongoOperators`.
 * @internal Not part of the public API.
 */
function buildAbilityPredicateFilter(input: unknown): RequestFilter {
  assertNoMongoOperators(input);

  if (!isPlainObject(input)) {
    return {};
  }

  const { ids, ...filter } = input;

  if (ids !== undefined) {
    return { _id: { $in: Array.isArray(ids) ? ids : [ids] } };
  }

  return filter;
}

export { assertNoMongoOperators, buildAbilityPredicateFilter };
