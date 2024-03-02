import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule, SchemaFactory } from '@nestjs/mongoose';
import { lowerCase } from 'lodash';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from './decorators';
import { DynamicApiOptions, DynamicAPISchemaOptionsInterface } from './interfaces';
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
    controllerOptions: {
      path,
      apiTag,
      version: controllerVersion,
      validationPipeOptions: controllerValidationPipeOptions,
    },
    routes = [],
  }: DynamicApiOptions<Entity>): DynamicModule {
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
      const contentName = lowerCase(entity.name);
      routes = [
        { type: 'GetMany', description: `Get many ${contentName}` },
        { type: 'GetOne', description: `Get one ${contentName} by id` },
        { type: 'CreateMany', description: `Create many ${contentName}` },
        { type: 'CreateOne', description: `Create one ${contentName}` },
        { type: 'ReplaceOne', description: `Replace one ${contentName}` },
        { type: 'UpdateOne', description: `Update one ${contentName}` },
        { type: 'DuplicateOne', description: `Duplicate one ${contentName}` },
        { type: 'DeleteOne', description: `Delete one ${contentName}` },
      ];
    }

    return {
      module: DynamicApiModule,
      imports: [
        ...routes
        .map(({
          type,
          description,
          version: routeVersion,
          dTOs,
          validationPipeOptions: routeValidationPipeOptions,
        }) => {
          const version = routeVersion ?? controllerVersion;

          let module: CreateManyModule
            | CreateOneModule
            | DeleteOneModule
            | DuplicateOneModule
            | GetManyModule
            | GetOneModule
            | ReplaceOneModule
            | UpdateOneModule;

          switch (type) {
            case 'CreateMany':
              module = CreateManyModule;
              break;

            case 'CreateOne':
              module = CreateOneModule;
              break;

            case 'DeleteOne':
              module = DeleteOneModule;
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

            case 'UpdateOne':
              module = UpdateOneModule;
              break;

            default:
              throw new Error(`Route for ${type} is not implemented`);
          }

          // @ts-ignore
          return module.forFeature(
            databaseModule,
            entity,
            path,
            apiTag,
            version,
            description,
            dTOs,
            routeValidationPipeOptions ?? controllerValidationPipeOptions,
          );
        })
        .filter((module) => module),
      ],
    };
  }
}
