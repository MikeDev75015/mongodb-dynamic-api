import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { SchemaFactory } from '@nestjs/mongoose';
import { DYNAMIC_API_SCHEMA_OPTIONS_METADATA, DynamicApiSchema } from './schema.decorator';

describe('DynamicApiSchema', () => {
  it('should attach the DynamicAPI-specific options (indexes/hooks/customInit) as metadata', () => {
    const callback = () => true;
    const customInit = () => undefined;

    @DynamicApiSchema({
      collection: 'users',
      indexes: [{ fields: { email: 1 }, options: { unique: true } }],
      hooks: [{ type: 'CreateOne', method: 'post', callback }],
      customInit,
    })
    class TestEntity {}

    const metadata = Reflect.getMetadata(DYNAMIC_API_SCHEMA_OPTIONS_METADATA, TestEntity);

    expect(metadata).toEqual({
      indexes: [{ fields: { email: 1 }, options: { unique: true } }],
      hooks: [{ type: 'CreateOne', method: 'post', callback }],
      customInit,
    });
  });

  it('should attach undefined DynamicAPI-specific options when none are provided', () => {
    @DynamicApiSchema()
    class TestEntity {}

    const metadata = Reflect.getMetadata(DYNAMIC_API_SCHEMA_OPTIONS_METADATA, TestEntity);

    expect(metadata).toEqual({
      indexes: undefined,
      hooks: undefined,
      customInit: undefined,
    });
  });

  it('should forward the mongoose-specific options to @nestjs/mongoose\'s own Schema decorator', () => {
    @DynamicApiSchema({
      collection: 'users',
      timestamps: true,
      indexes: [{ fields: { email: 1 } }],
    })
    class TestEntity {}

    const schema = SchemaFactory.createForClass(TestEntity);

    expect(schema.get('collection')).toBe('users');
    expect(schema.get('timestamps')).toBe(true);
  });

  it('should not forward DynamicAPI-specific options to the underlying mongoose schema options', () => {
    @DynamicApiSchema({
      collection: 'orders',
      indexes: [{ fields: { name: 1 } }],
      hooks: [{ type: 'CreateOne', method: 'post', callback: () => true }],
      customInit: () => undefined,
    })
    class TestEntity {}

    const schema = SchemaFactory.createForClass(TestEntity);

    expect(schema.get('collection')).toBe('orders');
    expect((schema.options as Record<string, unknown>).indexes).toBeUndefined();
    expect((schema.options as Record<string, unknown>).hooks).toBeUndefined();
    expect((schema.options as Record<string, unknown>).customInit).toBeUndefined();
  });
});
