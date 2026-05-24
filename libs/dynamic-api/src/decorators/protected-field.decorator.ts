const PROTECTED_FIELD_METADATA = 'dynamic-api-module:protected-field';

function ProtectedField(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing: (string | symbol)[] =
      Reflect.getMetadata(PROTECTED_FIELD_METADATA, target) ?? [];

    Reflect.defineMetadata(
      PROTECTED_FIELD_METADATA,
      [...existing, propertyKey],
      target,
    );
  };
}

export { PROTECTED_FIELD_METADATA, ProtectedField };

