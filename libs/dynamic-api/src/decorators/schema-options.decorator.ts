import { DynamicApiSchemaOptionsInterface } from '../interfaces';

/**
 * Metadata key for storing schema options
 * @type {string}
 */
const DYNAMIC_API_SCHEMA_OPTIONS_METADATA = 'dynamic-api-module:schema-options';

/**
 * DynamicApiSchemaOptions is a decorator that attaches metadata to a class.
 * The metadata includes options for defining indexes and hooks on a Mongoose schema.
 *
 * @param {DynamicApiSchemaOptionsInterface} options - The options for configuring the schema.
 * @returns {ClassDecorator} - A class decorator that attaches the provided schema options as metadata to the target class.
 */
function DynamicApiSchemaOptions(
  options: DynamicApiSchemaOptionsInterface,
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(
      DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
      options,
      target,
    );
  };
}

/**
 * @deprecated Use `DynamicApiSchemaOptions` instead. Will be removed in v5.
 */
const DynamicAPISchemaOptions = DynamicApiSchemaOptions;

export { DYNAMIC_API_SCHEMA_OPTIONS_METADATA, DynamicApiSchemaOptions, DynamicAPISchemaOptions };
