import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchemaFactory } from '@nestjs/mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../__mocks__/dynamic-api.module.mock';
import { SchemaHook } from '../interfaces';
import { buildSchemaFromEntity } from './schema.helper';

describe('buildSchemaFromEntity', () => {
  let fakeSchema: any;

  beforeEach(() => {
    fakeSchema = {
      set: vi.fn(),
      index: vi.fn(),
      pre: vi.fn(),
      post: vi.fn(),
      paths: {
        createdAt: {},
        updatedAt: {},
      },
    };

    vi.spyOn(SchemaFactory, 'createForClass').mockReturnValue(fakeSchema);
  });

  it('should not build schema with timestamps if entity does not have createdAt and updatedAt fields', () => {
    const { entity } = buildDynamicApiModuleOptionsMock();
    fakeSchema.paths = {};
    vi.spyOn(SchemaFactory, 'createForClass').mockReturnValueOnce(fakeSchema);

    buildSchemaFromEntity(entity);

    expect(fakeSchema.set).toHaveBeenCalledWith('timestamps', false);
    expect(fakeSchema.index).not.toHaveBeenCalled();
  });

  it('should build schema with timestamps if entity has createdAt and updatedAt fields', () => {
    const { entity } = buildDynamicApiModuleOptionsMock();
    buildSchemaFromEntity(entity);

    expect(fakeSchema.set).toHaveBeenCalledWith('timestamps', true);
    expect(fakeSchema.index).not.toHaveBeenCalled();
  });

  it('should build schema with timestamps if entity extends SoftDeletableEntity', () => {
    const { entity } = buildDynamicApiModuleOptionsMock({}, {}, true);
    buildSchemaFromEntity(entity);

    expect(fakeSchema.set).toHaveBeenCalledWith('timestamps', true);
    expect(fakeSchema.index).not.toHaveBeenCalled();
  });

  it('should build schema with indexes if provided', () => {
    const indexes = [
      {
        fields: { name: 1 },
        options: { unique: true },
      },
      {
        fields: { age: -1 },
      },
    ];
    const { entity } = buildDynamicApiModuleOptionsMock({}, {
      // @ts-ignore
      indexes,
    });
    buildSchemaFromEntity(entity);

    expect(fakeSchema.index).toHaveBeenCalledTimes(indexes.length);
    expect(fakeSchema.index).toHaveBeenNthCalledWith(1, { name: 1 }, { unique: true });
    expect(fakeSchema.index).toHaveBeenNthCalledWith(2, { age: -1 }, undefined);
  });

  it('should build schema with hooks if provided', () => {
    const hooks: SchemaHook[] = [
      {
        type: 'GetMany',
        method: 'pre',
        callback: vi.fn(),
        options: { query: false },
      },
      {
        type: 'CreateMany',
        method: 'post',
        callback: vi.fn(),
        options: { document: false },
      },
      {
        type: 'ReplaceOne',
        method: 'pre',
        callback: vi.fn(),
      },
    ];
    const { entity } = buildDynamicApiModuleOptionsMock({}, {
      // @ts-ignore
      hooks,
    }, true);
    buildSchemaFromEntity(entity);

    expect(fakeSchema.pre).toHaveBeenCalledTimes(2);
    expect(fakeSchema.pre).toHaveBeenNthCalledWith(
      1, 'find', { document: true, query: false }, hooks[0].callback,
    );
    expect(fakeSchema.pre)
    .toHaveBeenNthCalledWith(
      2, 'findOneAndReplace', { document: true, query: true }, hooks[2].callback,
    );

    expect(fakeSchema.post).toHaveBeenCalledTimes(1);
    expect(fakeSchema.post).toHaveBeenCalledWith(
      'save', { document: false, query: true }, hooks[1].callback,
    );
  });

  it('should build schema with soft deletable hooks if entity extends SoftDeletableEntity', () => {
    vi.spyOn(SchemaFactory, 'createForClass').mockReturnValue({
      ...fakeSchema,
      paths: { ...fakeSchema.paths, deletedAt: {} }
    });
    const hooks: SchemaHook[] = [
      {
        type: 'GetMany',
        method: 'pre',
        callback: vi.fn(),
        options: { query: false },
      },
      {
        type: 'DeleteMany',
        method: 'post',
        callback: vi.fn(),
        options: { document: false },
      },
      {
        type: 'DeleteOne',
        method: 'pre',
        callback: vi.fn(),
      },
    ];
    const { entity } = buildDynamicApiModuleOptionsMock({}, {
      // @ts-ignore
      hooks,
    }, true);
    buildSchemaFromEntity(entity);

    expect(fakeSchema.pre).toHaveBeenCalledTimes(2);
    expect(fakeSchema.pre).toHaveBeenNthCalledWith(
      1, 'find', { document: true, query: false }, hooks[0].callback,
    );
    expect(fakeSchema.pre)
    .toHaveBeenNthCalledWith(
      2, 'updateOne', { document: true, query: true }, hooks[2].callback,
    );

    expect(fakeSchema.post).toHaveBeenCalledTimes(1);
    expect(fakeSchema.post)
    .toHaveBeenNthCalledWith(
      1, 'updateMany', { document: false, query: true }, hooks[1].callback,
    );
  });

  it('should call customInit if provided', () => {
    const customInit = vi.fn();
    const { entity } = buildDynamicApiModuleOptionsMock({}, {
      customInit,
    });
    buildSchemaFromEntity(entity);

    expect(customInit).toHaveBeenCalledTimes(1);
    expect(customInit).toHaveBeenCalledWith(fakeSchema);
  });
});
