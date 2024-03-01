import { Type } from '@nestjs/common';
import { buildDynamicApiModuleOptionsMock } from '../../__mocks__/dynamic-api.module.mock';
import { DynamicAPISchemaOptionsInterface } from '../interfaces';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA } from './schema-options.decorator';

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
