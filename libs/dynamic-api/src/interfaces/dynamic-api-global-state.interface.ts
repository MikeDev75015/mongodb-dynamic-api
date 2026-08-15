import { GatewayMetadata } from '@nestjs/websockets';
import { Schema } from 'mongoose';
import { OnAfterSaveErrorHook } from './dynamic-api-service-callback.interface';
import { RouteType } from './dynamic-api-route-type.type';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
type Credentials = {
  loginField: string;
  passwordField: string;
};

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
type EntitySchemas<T = any> = {
  [name: string]: Schema<T>;
}

type RoutesConfig = {
  excluded: RouteType[];
  defaults: RouteType[];
}

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
interface DynamicApiGlobalState {
  initialized: boolean;
  uri: string;
  connectionName: string;
  isGlobalCacheEnabled: boolean;
  cacheExcludedPaths: string[];
  isAuthEnabled: boolean;
  credentials: Credentials;
  jwtSecret: string | undefined;
  jwtExpirationTime: string | number | undefined;
  jwtRefreshTokenExpiresIn: string | number | undefined;
  jwtRefreshSecret: string | undefined;
  jwtRefreshUseCookie: boolean | undefined;
  onAfterSaveError: OnAfterSaveErrorHook | undefined;
  refreshTokenOnUpdate: boolean;
  /** `useAuth.refreshToken.refreshTokenField`, if configured — used by {@link mintTokenPair} to default its own `refreshTokenField` option. */
  refreshTokenField: string | undefined;
  /** `useAuth.login.additionalFields`, if configured — used by {@link mintTokenPair} to default its own `additionalFields` option. */
  additionalRequestFields: string[];
  routesConfig: RoutesConfig;
  gatewayOptions: GatewayMetadata | undefined;
  broadcastGatewayOptions: GatewayMetadata | undefined;
}

export { DynamicApiGlobalState, Credentials, EntitySchemas, RoutesConfig };
