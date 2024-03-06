import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from './decorators';
import { getDefaultRouteDescription, isValidVersion } from './helpers';
import { DynamicApiForFeatureOptions, DynamicApiForRootOptions, DynamicAPISchemaOptionsInterface } from './interfaces';
import { BaseEntity } from './models';
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
} from './modules';

@Module({})
export class DynamicApiModule {
  static readonly connectionName = 'dynamic-api-connection';

  static isGlobalCacheEnabled = true;

  static forRoot(
    uri: string,
    { useGlobalCache = true, cacheOptions = {} }: DynamicApiForRootOptions = {},
  ): DynamicModule {
    if (!uri) {
      throw new Error(
        'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
      );
    }

    if (!useGlobalCache) {
      DynamicApiModule.isGlobalCacheEnabled = false;
    }

    return {
      module: DynamicApiModule,
      imports: [
        ...(
          useGlobalCache ? [CacheModule.register({ isGlobal: true, ...cacheOptions })] : []
        ),
        MongooseModule.forRoot(
          uri,
          { connectionName: DynamicApiModule.connectionName },
        ),
      ],
    };
  }

  static forFeature<Entity extends BaseEntity>({
    entity,
    controllerOptions: {
      path,
      apiTag,
      version: controllerVersion,
      validationPipeOptions: controllerValidationPipeOptions,
    },
    routes = [],
  }: DynamicApiForFeatureOptions<Entity>): DynamicModule {
    const { indexes, hooks } = Reflect.getOwnMetadata(
      DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
      entity,
    ) as DynamicAPISchemaOptionsInterface ?? {};

    const schema = SchemaFactory.createForClass(entity);
    schema.set('timestamps', true);

    if (indexes) {
      indexes.forEach(({ fields, options }) => {
        schema.index(fields, options);
      });
    }

    if (hooks?.length) {
      hooks.forEach(({ type, method, callback, options }) => {
        // @ts-ignore
        schema[method](
          type,
          { document: true, query: true, ...options },
          callback,
        );
      });
    }

    const databaseModule = MongooseModule.forFeature(
      [{ name: entity.name, schema }],
      DynamicApiModule.connectionName,
    );

    if (!routes.length) {
      routes = [
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

    return {
      module: DynamicApiModule,
      imports: [
        ...routes
        .map(({
          type,
          dTOs,
          description: routeDescription,
          version: routeVersion,
          validationPipeOptions: routeValidationPipeOptions,
        }) => {

          let module: CreateManyModule
            | CreateOneModule
            | DeleteManyModule
            | DeleteOneModule
            | DuplicateOneModule
            | GetManyModule
            | GetOneModule
            | ReplaceOneModule
            | UpdateManyModule
            | UpdateOneModule;

          switch (type) {
            case 'CreateMany':
              module = CreateManyModule;
              break;

            case 'CreateOne':
              module = CreateOneModule;
              break;

            case 'DeleteMany':
              module = DeleteManyModule;
              break;

            case 'DeleteOne':
              module = DeleteOneModule;
              break;

            case 'DuplicateMany':
              module = DuplicateManyModule;
              break;

            case 'DuplicateOne':
              module = DuplicateOneModule;
              break;

            case 'GetMany':
              module = GetManyModule;
              break;

            case 'GetOne':
              module = GetOneModule;
              break;

            case 'ReplaceOne':
              module = ReplaceOneModule;
              break;

            case 'UpdateMany':
              module = UpdateManyModule;
              break;

            case 'UpdateOne':
              module = UpdateOneModule;
              break;

            default:
              throw new Error(`Route for ${type} is not implemented`);
          }

          const description = routeDescription ?? getDefaultRouteDescription(type, entity.name);
          const version = routeVersion ?? controllerVersion;

          if (version && !isValidVersion(version)) {
            throw new Error(
              `Invalid version ${version} for ${type} route. Version must be a string that matches numeric format, e.g. 1, 2, 3, ..., 99.`,
            );
          }

          const validationPipeOptions = routeValidationPipeOptions ?? controllerValidationPipeOptions;

          // @ts-ignore
          return module.forFeature(
            databaseModule,
            entity,
            { path, apiTag },
            { description, dTOs },
            version,
            validationPipeOptions,
          );
        })
        .filter((module) => module),
      ],
      providers: [
        ...(
          DynamicApiModule.isGlobalCacheEnabled ? [
            {
              provide: APP_INTERCEPTOR,
              useClass: CacheInterceptor,
            },
          ] : []
        ),
      ],
    };
  }
}
