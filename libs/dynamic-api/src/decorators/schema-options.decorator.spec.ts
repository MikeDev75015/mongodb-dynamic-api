import {
  DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
  DynamicAPISchemaOptionsInterface,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { buildDynamicApiModuleOptionsMock } from '../../../../test/__mocks__/dynamic-api.module.mock';

describe('DynamicAPISchema', () => {
  let options: DynamicAPISchemaOptionsInterface;
  let entity: Type;

  beforeEach(() => {
    options = {
      indexes: [{ fields: { name: 1 }, options: { unique: true } }],
      hooks: [{ type: 'save', method: 'post', callback: () => true }],
    };

    entity = buildDynamicApiModuleOptionsMock({}, options).entity;
  });

  it('should return the provided options', () => {
    const metadata = Reflect.getMetadata(
      DYNAMIC_API_SCHEMA_OPTIONS_METADATA,
      entity,
    );

    expect(metadata).toEqual(options);
  });
});
