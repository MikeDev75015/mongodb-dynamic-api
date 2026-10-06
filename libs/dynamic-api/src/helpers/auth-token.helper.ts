/**
 * `typ` claim carried by every token MDA signs, so a token of one kind can never be accepted where
 * another is expected (e.g. a long-lived refresh token used as an access token when both share the
 * same secret). Reserved: a token signed with MDA's secrets must use one of these values.
 */
type AuthTokenType = 'access' | 'refresh' | 'reset';

/** JWT-only claims MDA reads on a verified payload. */
interface AuthTokenClaims {
  iat?: number;
  exp?: number;
  typ?: unknown;
}

/**
 * Whether `payload` is a token of type `expected`. A token without `typ` (signed before v5.4.2)
 * or with any other value is rejected. Same rule as MDA's own guards and socket adapter.
 *
 * @example
 * ```typescript
 * import { isTokenOfType } from 'mongodb-dynamic-api';
 *
 * const payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
 * if (!isTokenOfType(payload, 'refresh')) {
 *   throw new UnauthorizedException('Invalid token type');
 * }
 * ```
 */
function isTokenOfType(payload: AuthTokenClaims | null | undefined, expected: AuthTokenType): boolean {
  return payload?.typ === expected;
}

/**
 * Removes the JWT-only claims (`iat`, `exp`, `typ`) from a verified payload, leaving the user fields
 * to sign into a new token.
 *
 * @example
 * ```typescript
 * import { stripTokenClaims } from 'mongodb-dynamic-api';
 *
 * const user = stripTokenClaims(payload);
 * const accessToken = await this.jwtService.signAsync({ ...user, typ: 'access' });
 * ```
 */
function stripTokenClaims<T extends AuthTokenClaims>(payload: T): Omit<T, 'iat' | 'exp' | 'typ'> {
  const { iat, exp, typ, ...user } = payload;
  return user;
}

export { isTokenOfType, stripTokenClaims };
export type { AuthTokenClaims, AuthTokenType };
