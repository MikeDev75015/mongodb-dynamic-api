import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { StringValue } from 'ms';
import { BaseEntity } from '../models';
import { BcryptService } from '../services/bcrypt/bcrypt.service';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';

/**
 * Options for {@link mintTokenPair}.
 */
interface MintTokenPairOptions<Entity extends BaseEntity> {
  /**
   * Field included in the JWT payload as the user's login identifier.
   * Defaults to the `loginField` configured in `useAuth.login` (itself defaulting to `'email'`).
   */
  loginField?: keyof Entity;
  /**
   * Extra fields to include in the JWT payload beyond `_id`/`id`/`loginField`.
   * Defaults to `useAuth.login.additionalFields`.
   */
  additionalFields?: (keyof Entity)[];
  /**
   * Field where the hashed refresh token is stored, so the minted pair works with the standard
   * `POST /auth/refresh-token` and `POST /auth/logout` routes.
   * Defaults to `useAuth.refreshToken.refreshTokenField`. Leave both unset to skip server-side
   * refresh-token storage (the pair still works for access, just not for revocation/rotation).
   */
  refreshTokenField?: keyof Entity;
}

/** The `{ accessToken, refreshToken }` pair returned by {@link mintTokenPair}. */
interface MintTokenPairResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Mints an MDA-compatible `{ accessToken, refreshToken }` pair for `user`, equivalent to what
 * `POST /auth/login` returns — same JWT payload shape, same secrets/expirations (read from the
 * `useAuth` options passed to `DynamicApiModule.forRoot`), and, when a `refreshTokenField` is
 * configured, the same server-side refresh-token record so the pair works out of the box with the
 * standard `POST /auth/refresh-token` and `POST /auth/logout` routes.
 *
 * Use this to issue MDA tokens from a flow that bypasses `/auth/login` entirely — OAuth/social
 * login callbacks, SSO, magic links, or any custom authentication you wire up yourself — instead
 * of reverse-engineering the private JWT payload and refresh-token storage format.
 *
 * Requires `useAuth` to be configured in `DynamicApiModule.forRoot` (the secrets/expirations it
 * reads come from there) and `entity` to be registered via `forRoot`/`forFeature`.
 *
 * @param {Type<Entity>} entity The user entity class, as registered via `forRoot`/`forFeature`.
 * @param {Entity} user The user to mint tokens for — must carry `_id`/`id` and the login field.
 * @param {MintTokenPairOptions<Entity>} options Optional overrides for the login/additional/refresh-token fields.
 *
 * @example — minting tokens after a Google OAuth callback
 * ```typescript
 * import { mintTokenPair, Public } from 'mongodb-dynamic-api';
 *
 * @Controller('auth/google')
 * class GoogleAuthController {
 *   @Get('callback')
 *   @Public()
 *   async callback(@Query('code') code: string) {
 *     const googleUser = await this.googleService.exchangeCode(code);
 *     const user = await this.userService.findOrCreateFromGoogle(googleUser);
 *     return mintTokenPair(User, user);
 *   }
 * }
 * ```
 */
async function mintTokenPair<Entity extends BaseEntity>(
  entity: Type<Entity>,
  user: Entity,
  options: MintTokenPairOptions<Entity> = {},
): Promise<MintTokenPairResult> {
  // Read via the static getValue() accessor, never by instantiating DynamicApiGlobalStateService
  // here: its constructor resets the shared state to defaults (see its own doc comment) - `new`ing
  // it just to read a value would wipe out whatever DynamicApiModule.forRoot() already configured.
  const jwtSecret = DynamicApiGlobalStateService.getValue('jwtSecret');

  if (!jwtSecret) {
    throw new Error(
      '[DynamicAPI] mintTokenPair: useAuth is not configured in DynamicApiModule.forRoot(). '
      + 'mintTokenPair reuses the JWT secrets/expirations configured there.',
    );
  }

  const credentials = DynamicApiGlobalStateService.getValue('credentials');
  const loginField = (options.loginField ?? credentials?.loginField) as keyof Entity;
  const additionalFields =
    (options.additionalFields ?? DynamicApiGlobalStateService.getValue('additionalRequestFields') ?? []) as (keyof Entity)[];
  const refreshTokenField =
    (options.refreshTokenField ?? DynamicApiGlobalStateService.getValue('refreshTokenField')) as keyof Entity | undefined;

  const jwtService = new JwtService({
    secret: jwtSecret,
    signOptions: { expiresIn: DynamicApiGlobalStateService.getValue('jwtExpirationTime') as StringValue | number },
  });

  const fieldsToBuild = ['_id' as keyof Entity, 'id' as keyof Entity, loginField, ...additionalFields];
  const payload: object = fieldsToBuild.reduce(
    (acc, field) => (user[field] === undefined ? acc : { ...acc, [field]: user[field] }),
    {} as object,
  );

  const accessToken = jwtService.sign(payload);

  const refreshSecret = DynamicApiGlobalStateService.getValue('jwtRefreshSecret');
  const refreshTokenExpiresIn = DynamicApiGlobalStateService.getValue('jwtRefreshTokenExpiresIn');
  const refreshToken = jwtService.sign(
    { ...payload, jti: randomUUID() },
    {
      ...(refreshSecret ? { secret: refreshSecret } : {}),
      ...(refreshTokenExpiresIn ? { expiresIn: refreshTokenExpiresIn as StringValue | number } : {}),
    },
  );

  if (refreshTokenField && (user._id || user.id)) {
    const decoded = jwtService.decode(refreshToken);
    const jti: string = decoded && typeof decoded !== 'string' ? decoded['jti'] : '';
    const hashedJti = await new BcryptService().hashPassword(jti);
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    await model.updateOne(
      { _id: user._id || user.id },
      // @ts-ignore — dynamic field key
      { $set: { [refreshTokenField]: JSON.stringify({ currentHash: hashedJti }) } },
    ).exec();
  }

  return { accessToken, refreshToken };
}

export { mintTokenPair, MintTokenPairOptions, MintTokenPairResult };
