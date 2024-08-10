import { GatewayMetadata } from '@nestjs/websockets';
import { Schema } from 'mongoose';
import { RouteType } from './dynamic-api-route-type.type';

type Credentials = {
  loginField: string;
  passwordField: string;
};

type EntitySchemas<T = any> = {
  [name: string]: Schema<T>;
}

type RoutesConfig = {
  excluded: RouteType[];
  defaults: RouteType[];
}

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
  routesConfig: RoutesConfig;
  gatewayOptions: GatewayMetadata | undefined;
}

export { DynamicApiGlobalState, Credentials, EntitySchemas, RoutesConfig };
