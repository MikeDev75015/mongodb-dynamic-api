import { applyDecorators } from '@nestjs/common';
import { Schema, SchemaOptions } from '@nestjs/mongoose';
import { DynamicApiSchemaOptions } from '../interfaces';

/**
 * Metadata key for storing schema options
 * @type {string}
 */
const DYNAMIC_API_SCHEMA_OPTIONS_METADATA = 'dynamic-api-module:schema-options';

/**
 * DynamicApiSchema is a decorator that combines `@nestjs/mongoose`'s own `@Schema()` decorator
 * with DynamicAPI's own schema metadata into a single call. It accepts the union of mongoose's
 * `SchemaOptions` (e.g. `collection`, `timestamps`) and DynamicAPI's extras (`indexes`, `hooks`,
 * `customInit`), forwards the mongoose-specific options to `@Schema()`, and attaches the
 * DynamicAPI-specific ones as metadata read by `buildSchemaFromEntity`.
 *
 * @param {SchemaOptions & DynamicApiSchemaOptions} options - The combined mongoose and DynamicAPI
 * schema options.
 * @returns {ClassDecorator} - A class decorator that applies mongoose's `@Schema()` decorator and
 * attaches the DynamicAPI-specific options as metadata to the target class.
 *
 * @example
 * ```typescript
 * import { DynamicApiSchema } from 'mongodb-dynamic-api';
 *
 * @DynamicApiSchema({
 *   collection: 'users',
 *   indexes: [{ fields: { email: 1 }, options: { unique: true } }],
 * })
 * class User extends BaseEntity {}
 * ```
 */
function DynamicApiSchema(
  options: SchemaOptions & DynamicApiSchemaOptions = {},
): ClassDecorator {
  const { indexes, hooks, customInit, ...mongooseSchemaOptions } = options;

  return applyDecorators(
    Schema(mongooseSchemaOptions),
    (target: object) => {
      Reflect.defineMetadata(
        DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
        { indexes, hooks, customInit },
        target,
      );
    },
  );
}

export { DYNAMIC_API_SCHEMA_OPTIONS_METADATA, DynamicApiSchema };
