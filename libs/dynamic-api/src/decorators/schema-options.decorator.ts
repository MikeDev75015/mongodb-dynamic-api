import { DynamicAPISchemaOptionsInterface } from '@dynamic-api';

const DYNAMIC_API_SCHEMA_OPTIONS_METADATA = 'dynamic-api-module:schema-options';

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
