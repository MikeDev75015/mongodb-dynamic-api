import { describe, expect, it } from 'vitest';
import { AuthTokenType, isTokenOfType, stripTokenClaims } from './auth-token.helper';

describe('auth-token.helper', () => {
  describe('isTokenOfType', () => {
    it.each<[string, { typ?: unknown } | null | undefined, AuthTokenType, boolean]>([
      ['no payload', undefined, 'access', false],
      ['a null payload', null, 'refresh', false],
      ['a matching access token', { typ: 'access' }, 'access', true],
      ['a matching refresh token', { typ: 'refresh' }, 'refresh', true],
      ['a matching reset token', { typ: 'reset' }, 'reset', true],
      ['a refresh token used as access token', { typ: 'refresh' }, 'access', false],
      ['an access token used as refresh token', { typ: 'access' }, 'refresh', false],
      ['an access token used as reset token', { typ: 'access' }, 'reset', false],
      ['a legacy access token without typ', {}, 'access', true],
      ['a legacy refresh token without typ', {}, 'refresh', true],
      ['a reset token without typ', {}, 'reset', false],
    ])('should handle %s', (_, payload, expected, result) => {
      expect(isTokenOfType(payload, expected)).toBe(result);
    });
  });

  describe('stripTokenClaims', () => {
    it('should remove iat, exp and typ and keep the user fields', () => {
      expect(stripTokenClaims({ id: 'u1', email: 'a@b.co', iat: 1, exp: 2, typ: 'access' }))
        .toStrictEqual({ id: 'u1', email: 'a@b.co' });
    });
  });
});
