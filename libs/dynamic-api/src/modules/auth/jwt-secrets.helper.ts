import { DynamicApiAuthOptions } from './interfaces';

/**
 * Refuses to start the auth module without explicit, distinct JWT secrets. There is no default
 * secret any more: a default ships with the package, so anyone could forge tokens signed with it.
 * @internal Not part of the public API.
 */
function assertJwtSecrets(jwt: DynamicApiAuthOptions['jwt']): void {
  if (!jwt?.secret) {
    throw new Error(
      '[DynamicAPI] useAuth.jwt.secret is required: set it to a long random value (e.g. from an environment variable).',
    );
  }

  if (!jwt.refreshSecret) {
    throw new Error(
      '[DynamicAPI] useAuth.jwt.refreshSecret is required: set it to a long random value, distinct from useAuth.jwt.secret.',
    );
  }

  if (jwt.refreshSecret === jwt.secret) {
    throw new Error('[DynamicAPI] useAuth.jwt.refreshSecret must be different from useAuth.jwt.secret.');
  }
}

export { assertJwtSecrets };
