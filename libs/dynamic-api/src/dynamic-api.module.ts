import { DEFAULT_BDD_CONNECTION_NAME } from '@dynamic-api/dynamic-api.constant';
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from './decorators';
import {
  DynamicApiOptions,
  DynamicAPISchemaOptionsInterface,
} from './interfaces';
import { BaseEntity } from './models';
import {
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
  static forRoot(mongodbUri?: string): DynamicModule {
    if (!mongodbUri && (!process.env.BDD_URL || !process.env.BDD_BASE)) {
      throw new Error(
        'You must provide a mongodbUri or set the BDD_URL and BDD_BASE environment variables',
      );
    }
    return {
      module: DynamicApiModule,
      imports: [
        MongooseModule.forRoot(
          mongodbUri ??
            `${process.env.BDD_URL}/${process.env.BDD_BASE}?retryWrites=true&w=majority`,
          {
            connectionName:
              process.env.BBD_CONNECTION_NAME || DEFAULT_BDD_CONNECTION_NAME,
          },
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
      process.env.BBD_CONNECTION_NAME || DEFAULT_BDD_CONNECTION_NAME,
    );

    return {
      module: DynamicApiModule,
      imports: [
        ...routes
          .map(({ type, description, version: routeVersion, dTOs }) => {
            const version = routeVersion ?? apiVersion;

            switch (type) {
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
