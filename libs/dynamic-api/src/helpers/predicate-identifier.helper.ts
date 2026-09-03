/**
 * Resolves a value from `source` for a "field" option that may be a single property name or an
 * ordered array of fallback property names — the first property holding a defined, non-null value
 * wins. Lets `isOwner`/`isGroupMember` model identifiers that live under different names depending
 * on context (e.g. `id` on an HTTP request's user, `sub` on a raw JWT payload, `_id` on a Mongoose
 * document), instead of only ever reading one flat field.
 *
 * @internal Not part of the public API.
 */
function resolveIdentifierField<T>(source: T, fields: keyof T | (keyof T)[]): unknown {
  const fieldList = Array.isArray(fields) ? fields : [fields];

  for (const field of fieldList) {
    const value = source[field];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

/**
 * True for values that stringify to something meaningful: primitives, or objects that override
 * `Object.prototype.toString` (e.g. a Mongoose `ObjectId`). False for a plain object, which would
 * otherwise stringify to the generic `'[object Object]'` — two unrelated plain objects would then
 * look equal to {@link identifiersMatch}'s string-coerced fallback. A real type guard (not just a
 * boolean check) so `entityValue`/`userValue` are narrowed away from `unknown` at the `String()`
 * call site below — the point isn't just the runtime safety, it's giving `String()` an argument
 * type that's actually known to declare `toString()`.
 */
function isStringifiable(value: unknown): value is string | number | boolean | bigint | { toString(): string } {
  const type = typeof value;

  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
    return true;
  }

  return type === 'object' && value !== null && (value as object).toString !== Object.prototype.toString;
}

/**
 * Default comparison used by `isOwner`/`isGroupMember`: strict equality, falling back to a
 * string-coerced comparison when that fails. Covers the most common owner/group mismatch without
 * any configuration — a Mongoose `ObjectId` on the entity side (`family._id`) compared against its
 * string form on the user side (`user.familyId`), which are never `===`-equal despite representing
 * the same id.
 *
 * @internal Not part of the public API.
 */
function identifiersMatch(entityValue: unknown, userValue: unknown): boolean {
  if (entityValue === userValue) {
    return true;
  }

  if (entityValue == null || userValue == null) {
    return false;
  }

  if (!isStringifiable(entityValue) || !isStringifiable(userValue)) {
    return false;
  }

  return String(entityValue) === String(userValue);
}

export { resolveIdentifierField, identifiersMatch };
