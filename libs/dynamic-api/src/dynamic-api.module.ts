import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from './decorators';
import {
  DynamicApiOptions,
  DynamicAPISchemaOptionsInterface,
} from './interfaces';
import { BaseEntity } from './models';
import {
  CreateManyModule,
  CreateOneModule,
  DeleteOneModule,
  DuplicateOneModule,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  UpdateOneModule,
} from './modules';

@Module({})
export class DynamicApiModule {
  static connectionName = 'dynamic-api-connection';

  static forRoot(uri: string): DynamicModule {
    if (!uri) {
      throw new Error(
        'You must provide a valid mongodb uri in the forRoot method to use MongoDB Dynamic API',
      );
    }

    return {
      module: DynamicApiModule,
      imports: [
        MongooseModule.forRoot(
          uri,
          { connectionName: DynamicApiModule.connectionName },
        ),
      ],
    };
  }

  static forFeature<Entity extends BaseEntity>({
    entity,
    controllerOptions: { path, apiTag, version: apiVersion },
    routes,
  }: DynamicApiOptions<Entity>): DynamicModule {
    const { indexes, hooks } = Reflect.getOwnMetadata(
      DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
      entity,
    ) as DynamicAPISchemaOptionsInterface;
    const schema = SchemaFactory.createForClass(entity);

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

    return {
      module: DynamicApiModule,
      imports: [
        ...routes
          .map(({ type, description, version: routeVersion, dTOs }) => {
            const version = routeVersion ?? apiVersion;

            switch (type) {
              case 'CreateMany':
                return CreateManyModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'CreateOne':
                return CreateOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'DeleteOne':
                return DeleteOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'DuplicateOne':
                return DuplicateOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'GetMany':
                return GetManyModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'GetOne':
                return GetOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'ReplaceOne':
                return ReplaceOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              case 'UpdateOne':
                return UpdateOneModule.forFeature(
                  databaseModule,
                  entity,
                  path,
                  apiTag,
                  version,
                  description,
                  dTOs,
                );

              default:
                throw new Error(`Route for ${type} is not implemented`);
            }
          })
          .filter((module) => module),
      ],
    };
  }
}
