import { Type } from '@nestjs/common';
import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from '../decorators';
import { DynamicAPISchemaOptionsInterface } from '../interfaces';

/**
 * buildSchemaFromEntity is a helper function that takes an entity class and returns a Mongoose schema for that entity.
 * It uses the DynamicAPISchemaOptions metadata attached to the entity class to configure the schema.
 * @param {Type<Entity>} entity - The entity class to build the schema from.
 * @returns {Schema<Entity>} - The built Mongoose schema.
 */
function buildSchemaFromEntity<Entity>(
  entity: Type<Entity>,
): Schema<Entity> {
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
  return schema;
}

export { buildSchemaFromEntity };
