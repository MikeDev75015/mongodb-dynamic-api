import { DynamicApiForRootOptions } from '../../src';

/** JWT secrets used by every e2e app: v6 refuses to start the auth module without them. */
export const TEST_JWT_SECRETS = { secret: 'e2e-jwt-secret', refreshSecret: 'e2e-jwt-refresh-secret' };

/** Fills in `useAuth.jwt` secrets a test doesn't set explicitly. */
export const withTestJwtSecrets = <Options extends DynamicApiForRootOptions>(options: Options): Options => (
  options?.useAuth
    ? { ...options, useAuth: { ...options.useAuth, jwt: { ...TEST_JWT_SECRETS, ...options.useAuth.jwt } } }
    : options
);
