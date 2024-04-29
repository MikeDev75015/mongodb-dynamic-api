import { Schema } from 'mongoose';
import { BehaviorSubject } from 'rxjs';
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
  connectionName: string;
  isGlobalCacheEnabled: boolean;
  cacheExcludedPaths: string[];
  isAuthEnabled: boolean;
  credentials: Credentials;
  jwtSecret: string | undefined;
  routesConfig: RoutesConfig;

  onInitialized(): BehaviorSubject<boolean>;
  addEntitySchema<T = any>(name: string, schema: Schema<T>): void;
  getEntitySchema<T = any>(name: string): Schema<T>;
}

export { DynamicApiGlobalState, Credentials, EntitySchemas, RoutesConfig };
