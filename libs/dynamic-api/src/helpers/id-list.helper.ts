/**
 * Normalizes the `ids` query parameter of the `*Many` routes to an array.
 *
 * Express parses `?ids=a&ids=b` as `['a', 'b']` but a single `?ids=a` as the string `'a'` — the
 * exact query a generated OpenAPI client sends for a one-element array. Without this, a single id
 * was either rejected (`ArrayMinSize`) or handled as a string.
 * @internal Not part of the public API.
 */
function toIdList(ids: unknown): string[] {
  if (ids === undefined || ids === null || ids === '') {
    return [];
  }

  return (Array.isArray(ids) ? ids : [ids]).map(String);
}

export { toIdList };
