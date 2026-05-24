const DERIVED_FIELD_METADATA = 'dynamic-api-module:derived-field';
const DERIVED_FIELD_KEYS_METADATA = 'dynamic-api-module:derived-field-keys';

interface DerivedFieldOptions {
  on?: 'save' | 'read' | 'both';
}

interface DerivedFieldMeta<Entity> {
  computeFn: (entity: Partial<Entity>) => unknown;
  on: 'save' | 'read' | 'both';
}

function DerivedField<Entity>(
  computeFn: (entity: Partial<Entity>) => unknown,
  options?: DerivedFieldOptions,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing: (string | symbol)[] =
      Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, target) ?? [];

    Reflect.defineMetadata(
      DERIVED_FIELD_KEYS_METADATA,
      [...existing, propertyKey],
      target,
    );

    Reflect.defineMetadata(
      DERIVED_FIELD_METADATA,
      { computeFn, on: options?.on ?? 'save' } satisfies DerivedFieldMeta<Entity>,
      target,
      propertyKey,
    );
  };
}

export { DERIVED_FIELD_METADATA, DERIVED_FIELD_KEYS_METADATA, DerivedField, DerivedFieldMeta, DerivedFieldOptions };

