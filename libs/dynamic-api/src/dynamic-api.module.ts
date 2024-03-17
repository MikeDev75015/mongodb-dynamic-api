import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { MongooseModule } from '@nestjs/mongoose';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { DynamicApiJwtAuthGuard } from './guards';
import { buildSchemaFromEntity, getDefaultRouteDescription, isValidVersion } from './helpers';
import { DynamicApiCacheInterceptor } from './interceptors';
import {
  DYNAMIC_API_GLOBAL_STATE,
  DynamicApiForFeatureOptions,
  DynamicApiForRootOptions,
  DynamicApiGlobalState,
  DynamicAPIRouteConfig,
  RouteModule,
  RouteType,
} from './interfaces';
import { BaseEntity } from './models';
import { AuthModule, DynamicApiConfigModule } from './modules';
import {
  CreateManyModule,
  CreateOneModule,
  DeleteManyModule,
  DeleteOneModule,
  DuplicateManyModule,
  DuplicateOneModule,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  UpdateManyModule,
  UpdateOneModule,
} from './routes';
import { DynamicApiGlobalStateService } from './services';

/**
 * DynamicApiModule is a module that provides dynamic API functionality.
 * It includes methods for setting up the module at the root level and for individual features.
 * It also includes a state service for managing global state.
 */
@Module({})
export class DynamicApiModule {
  /**
   * The global state service for the DynamicApiModule.
   * It is initialized with a default state.
   */
  static readonly state = new DynamicApiGlobalStateService({
    connectionName: 'dynamic-api-connection',
    isGlobalCacheEnabled: true,
    isAuthEnabled: false,
    credentials: null,
    jwtSecret: undefined,
    cacheExcludedPaths: [],
  });

  /**
   * Sets up the DynamicApiModule at the root level.
   * It requires a MongoDB URI and optionally accepts root options for configuring the module.
   * @param {string} uri - The MongoDB URI.
   * @param {DynamicApiForRootOptions} options - The root options for configuring the module.
   * @returns {DynamicModule} - The configured DynamicApiModule.
   */
  static forRoot(
    uri: string,
    {
      useGlobalCache = true,
      cacheOptions = {},
      useAuth,
    }: DynamicApiForRootOptions = {},
  ): DynamicModule {
    if (!uri) {
      throw new Error(
        'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
      );
    }

    this.state.set([
      'partial', {
        initialized: true,
        isGlobalCacheEnabled: useGlobalCache,
        ...(
          cacheOptions?.excludePaths ? { cacheExcludedPaths: cacheOptions?.excludePaths } : {}
        ),
        ...(
          useAuth?.user ? {
            isAuthEnabled: true,
            credentials: {
              loginField: !useAuth.user.loginField ? 'email' : String(useAuth.user.loginField),
              passwordField: !useAuth.user.passwordField ? 'password' : String(useAuth.user.passwordField),
            },
            jwtSecret: useAuth.jwt?.secret ?? 'dynamic-api-jwt-secret',
          } : {}
        ),
      },
    ]);

    return {
      module: DynamicApiModule,
      imports: [
        DynamicApiConfigModule.register(this.state.get()),
        CacheModule.register({ isGlobal: true, ...cacheOptions }),
        MongooseModule.forRoot(
          uri,
          { connectionName: this.state.get('connectionName') },
        ),
        ...(
          useAuth?.user ? [
            AuthModule.forRoot({
              user: {
                entity: useAuth.user.entity,
                loginField: useAuth.user.loginField ?? 'email',
                passwordField: useAuth.user.passwordField ?? 'password',
                requestAdditionalFields: useAuth.user.requestAdditionalFields ?? [],
              },
              jwt: {
                secret: useAuth.jwt?.secret ?? 'dynamic-api-jwt-secret',
                expiresIn: useAuth.jwt?.expiresIn ?? '1d',
              },
              register: useAuth.register ?? {
                protected: false,
                additionalFields: [],
              },
            }),
          ] : []
        ),
      ],
      exports: [DynamicApiConfigModule],
    };
  }

  /**
   * Sets up the DynamicApiModule for a specific feature.
   * It requires an entity and optionally accepts feature options for configuring the module.
   * @param {DynamicApiForFeatureOptions} options - The feature options for configuring the module.
   * @returns {Promise<DynamicModule>} - A promise that resolves with the configured DynamicApiModule.
   */
  static forFeature<Entity extends BaseEntity>({
    entity,
    controllerOptions,
    routes = [],
  }: DynamicApiForFeatureOptions<Entity>): Promise<DynamicModule> {
    const databaseModule = MongooseModule.forFeature(
      [{ name: entity.name, schema: buildSchemaFromEntity(entity) }],
      this.state.get('connectionName'),
    );

    routes = this.setDefaultRoutesIfNotConfigured([...routes]);

    return new Promise((resolve, reject) => {
      const waitInitializedStateInterval = setInterval(async () => {
        const stateInitialized = await firstValueFrom(this.state.get().onInitialized());
        if (!stateInitialized) {
          return;
        }

        if (waitForState) {
          clearTimeout(waitForState);
        }
        clearInterval(waitInitializedStateInterval);

        const {
          version: controllerVersion,
          validationPipeOptions: controllerValidationPipeOptions,
        } = controllerOptions;

        const castType = (t: RouteType) => t;
        const castModule = (m: RouteModule) => m;

        const moduleByRouteType: Map<RouteType, RouteModule> = new Map([
          [castType('CreateMany'), castModule(CreateManyModule)],
          [castType('CreateOne'), castModule(CreateOneModule)],
          [castType('DeleteMany'), castModule(DeleteManyModule)],
          [castType('DeleteOne'), castModule(DeleteOneModule)],
          [castType('DuplicateMany'), castModule(DuplicateManyModule)],
          [castType('DuplicateOne'), castModule(DuplicateOneModule)],
          [castType('GetMany'), castModule(GetManyModule)],
          [castType('GetOne'), castModule(GetOneModule)],
          [castType('ReplaceOne'), castModule(ReplaceOneModule)],
          [castType('UpdateMany'), castModule(UpdateManyModule)],
          [castType('UpdateOne'), castModule(UpdateOneModule)],
        ]);

        const apiModule = {
          module: DynamicApiModule,
          imports: [
            ...routes.map((routeConfig) => {
              const {
                type,
                description: routeDescription,
                version: routeVersion,
                validationPipeOptions: routeValidationPipeOptions,
              } = routeConfig;

              const module = moduleByRouteType.get(type);

              if (!module) {
                reject(new Error(`Route module for ${type} not found`));
                return;
              }

              const description = routeDescription ?? getDefaultRouteDescription(type, entity.name);

              const version = routeVersion ?? controllerVersion;
              if (version && !isValidVersion(version)) {
                reject(
                  new Error(
                    `Invalid version ${version} for ${type} route.`
                    + ' Version must be a string that matches numeric format, e.g. 1, 2, 3, ..., 99.',
                  ),
                );
                return;
              }

              const validationPipeOptions = routeValidationPipeOptions ?? controllerValidationPipeOptions;

              // @ts-ignore
              return module.forFeature(
                databaseModule,
                entity,
                controllerOptions,
                { ...routeConfig, description },
                version,
                validationPipeOptions ?? { transform: true },
              );
            }),
          ],
          providers: [
            {
              provide: APP_INTERCEPTOR,
              inject: [CACHE_MANAGER, Reflector, HttpAdapterHost, DYNAMIC_API_GLOBAL_STATE],
              useFactory: (
                cacheManager: Cache,
                reflector: Reflector,
                httpAdapterHost: HttpAdapterHost,
                state: DynamicApiGlobalState,
              ) => {
                return new DynamicApiCacheInterceptor(cacheManager, reflector, httpAdapterHost, state);
              },
            },
            {
              provide: APP_GUARD,
              inject: [Reflector, DYNAMIC_API_GLOBAL_STATE],
              useFactory: (
                reflector: Reflector,
                state: DynamicApiGlobalState,
              ) => {
                return new DynamicApiJwtAuthGuard(reflector, state);
              },
            },
          ],
        };

        resolve(apiModule);
      }, 500);

      const waitForState = setTimeout(() => {
        clearInterval(waitInitializedStateInterval);
        reject(new Error('Dynamic API state could not be initialized. Please check your configuration.'));
      }, 5000);
    });
  }

  /**
   * Sets default routes if none are configured.
   * @param {DynamicAPIRouteConfig[]} routes - The routes to configure.
   * @returns {DynamicAPIRouteConfig[]} - The configured routes.
   */
  private static setDefaultRoutesIfNotConfigured<Entity extends BaseEntity>(
    routes: DynamicAPIRouteConfig<Entity>[]): DynamicAPIRouteConfig<Entity>[] {
    if (!routes.length) {
      return [
        { type: 'GetMany' },
        { type: 'GetOne' },
        { type: 'CreateMany' },
        { type: 'CreateOne' },
        { type: 'UpdateMany' },
        { type: 'UpdateOne' },
        { type: 'ReplaceOne' },
        { type: 'DuplicateMany' },
        { type: 'DuplicateOne' },
        { type: 'DeleteMany' },
        { type: 'DeleteOne' },
      ];
    }

    return routes;
  }
}
