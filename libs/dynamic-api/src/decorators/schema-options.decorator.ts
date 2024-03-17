import { DynamicAPISchemaOptionsInterface } from '../interfaces';

const DYNAMIC_API_SCHEMA_OPTIONS_METADATA = 'dynamic-api-module:schema-options';

/**
 * DynamicAPISchemaOptions is a decorator that attaches metadata to a class.
 * The metadata includes options for defining indexes and hooks on a Mongoose schema.
 * @param {DynamicAPISchemaOptionsInterface} options - The options for configuring the schema.
 */
function DynamicAPISchemaOptions(
  options: DynamicAPISchemaOptionsInterface,
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(
      DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
      options,
      target,
    );
  };
}

export { DYNAMIC_API_SCHEMA_OPTIONS_METADATA, DynamicAPISchemaOptions };
