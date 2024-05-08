import { Type } from '@nestjs/common';
import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from '../decorators';
import { DynamicAPISchemaOptionsInterface, queryByRouteTypeMap } from '../interfaces';

/**
 * buildSchemaFromEntity is a helper function that takes an entity class and returns a Mongoose schema for that entity.
 * It uses the DynamicAPISchemaOptions metadata attached to the entity class to configure the schema.
 * @param {Type} entity - The entity class to build the schema from.
 * @returns {Schema} - The built Mongoose schema.
 */
function buildSchemaFromEntity<Entity>(
  entity: Type<Entity>,
): Schema<Entity> {
  const schemaOptions = Reflect.getOwnMetadata(
    DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
    entity,
  ) as DynamicAPISchemaOptionsInterface;

  const schema = SchemaFactory.createForClass(entity);

  schema.set(
    'timestamps',
    Object.getOwnPropertyNames(schema.paths).includes('createdAt') &&
    Object.getOwnPropertyNames(schema.paths).includes('updatedAt'),
  );

  if (schemaOptions?.indexes) {
    schemaOptions.indexes.forEach(({ fields, options }) => {
      schema.index(fields, options);
    });
  }

  if (schemaOptions?.hooks?.length) {
    const isSoftDeletable = Object.getOwnPropertyNames(schema.paths).includes('deletedAt');

    schemaOptions.hooks.forEach(({ type, method, callback, options }) => {
      const { query, softDeletableQuery } = queryByRouteTypeMap.get(type);

      // @ts-ignore
      schema[method](
        isSoftDeletable && softDeletableQuery ? softDeletableQuery : query,
        { document: true, query: true, ...options },
        callback,
      );
    });
  }

  if (schemaOptions?.customInit) {
    schemaOptions.customInit(schema);
  }

  return schema;
}

export { buildSchemaFromEntity };
