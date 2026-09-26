import { describe, expect, it } from 'vitest';
import { assertJwtSecrets } from './jwt-secrets.helper';

describe('assertJwtSecrets', () => {
  it.each([
    ['no jwt options', undefined, 'useAuth.jwt.secret is required'],
    ['an empty secret', { secret: '' }, 'useAuth.jwt.secret is required'],
    ['no refreshSecret', { secret: 's' }, 'useAuth.jwt.refreshSecret is required'],
    ['identical secrets', { secret: 's', refreshSecret: 's' }, 'must be different from useAuth.jwt.secret'],
  ])('should throw with %s', (_, jwt, message) => {
    expect(() => assertJwtSecrets(jwt)).toThrow(message);
  });

  it('should accept two distinct secrets', () => {
    expect(() => assertJwtSecrets({ secret: 's', refreshSecret: 'r' })).not.toThrow();
  });
});
