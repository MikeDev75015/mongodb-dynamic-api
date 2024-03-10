import { BehaviorSubject } from 'rxjs';

type Credentials = {
  loginField: string;
  passwordField: string;
};

interface DynamicApiGlobalState {
  initialized: boolean;
  connectionName: string;
  isGlobalCacheEnabled: boolean;
  cacheExcludedPaths: string[];
  isAuthEnabled: boolean;
  credentials: Credentials;
  jwtSecret: string | undefined;

  onInitialized(): BehaviorSubject<boolean>;
}

export { DynamicApiGlobalState, Credentials };
