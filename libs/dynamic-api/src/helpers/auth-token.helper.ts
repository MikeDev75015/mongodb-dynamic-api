/**
 * `typ` claim carried by every token MDA signs, so a token of one kind can never be accepted where
 * another is expected (e.g. a long-lived refresh token used as an access token when both share the
 * same secret).
 * @internal Not part of the public API.
 */
type AuthTokenType = 'access' | 'refresh' | 'reset';

interface AuthTokenClaims {
  iat?: number;
  exp?: number;
  typ?: unknown;
}

/**
 * Whether `payload` may be used as a token of type `expected`. Access and refresh tokens signed
 * before the `typ` claim existed carry none: they stay accepted until they expire, so upgrading
 * doesn't log every user out. Reset-password tokens are short-lived and always need the claim.
 * @internal Not part of the public API.
 */
function isTokenOfType(payload: AuthTokenClaims | null | undefined, expected: AuthTokenType): boolean {
  if (!payload) {
    return false;
  }

  if (payload.typ === undefined) {
    return expected !== 'reset';
  }

  return payload.typ === expected;
}

/**
 * Removes the JWT-only claims (`iat`, `exp`, `typ`) from a verified payload, leaving the user fields.
 * @internal Not part of the public API.
 */
function stripTokenClaims<T extends AuthTokenClaims>(payload: T): Omit<T, 'iat' | 'exp' | 'typ'> {
  const { iat, exp, typ, ...user } = payload;
  return user;
}

export { isTokenOfType, stripTokenClaims };
export type { AuthTokenType };
