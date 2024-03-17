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
  const { indexes, hooks } = Reflect.getOwnMetadata(
    DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
    entity,
  ) as DynamicAPISchemaOptionsInterface ?? {};

  const schema = SchemaFactory.createForClass(entity);
  if (Object.getOwnPropertyNames(schema.paths).includes('createdAt')) {
    schema.set('timestamps', true);
  }

  if (indexes) {
    indexes.forEach(({ fields, options }) => {
      schema.index(fields, options);
    });
  }

  if (hooks?.length) {
    const isSoftDeletable = Object.getOwnPropertyNames(schema.paths).includes('deletedAt');

    hooks.forEach(({ type, method, callback, options }) => {
      const { query, softDeletableQuery } = queryByRouteTypeMap.get(type);

      // @ts-ignore
      schema[method](
        isSoftDeletable && softDeletableQuery ? softDeletableQuery : query,
        { document: true, query: true, ...options },
        callback,
      );
    });
  }
  return schema;
}

export { buildSchemaFromEntity };
