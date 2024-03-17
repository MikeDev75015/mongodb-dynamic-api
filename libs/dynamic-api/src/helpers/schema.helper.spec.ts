import { SchemaFactory } from '@nestjs/mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../__mocks__/dynamic-api.module.mock';
import { SchemaHook } from '../interfaces';
import { buildSchemaFromEntity } from './schema.helper';

describe('buildSchemaFromEntity', () => {
  let entity;

  describe('extends BaseEntity', () => {
    beforeEach(() => {
      const mock = buildDynamicApiModuleOptionsMock();
      entity = mock.entity;
      jest.spyOn(SchemaFactory, 'createForClass').mockReturnValueOnce(mock.fakeSchema);
    });

    it('should build schema with timestamps', () => {
      const schema = buildSchemaFromEntity(entity);
      expect(schema.set).toHaveBeenCalledWith('timestamps', true);
      expect(schema.index).not.toHaveBeenCalled();
    });
  });

  describe('extends SoftDeletableEntity', () => {
    beforeEach(() => {
      const mock = buildDynamicApiModuleOptionsMock({}, {}, true);
      entity = mock.entity;
      jest.spyOn(SchemaFactory, 'createForClass').mockReturnValueOnce(mock.fakeSchema);
    });

    it('should build schema with timestamps', () => {
      const schema = buildSchemaFromEntity(entity);
      expect(schema.set).toHaveBeenCalledWith('timestamps', true);
      expect(schema.index).not.toHaveBeenCalled();
    });
  });

  describe('with indexes', () => {
    const indexes = [
      {
        fields: { name: 1 },
        options: { unique: true },
      },
      {
        fields: { age: -1 },
      },
    ];

    beforeEach(() => {
      const mock = buildDynamicApiModuleOptionsMock({}, {
        // @ts-ignore
        indexes,
      });
      entity = mock.entity;
      jest.spyOn(SchemaFactory, 'createForClass').mockReturnValueOnce(mock.fakeSchema);
    });

    it('should build schema with indexes if provided', () => {
      const schema = buildSchemaFromEntity(entity);

      expect(schema.index).toHaveBeenCalledTimes(indexes.length);
      expect(schema.index).toHaveBeenNthCalledWith(1, { name: 1 }, { unique: true });
      expect(schema.index).toHaveBeenNthCalledWith(2, { age: -1 }, undefined);
    });
  });

  describe('with hooks', () => {
    const hooks: SchemaHook[] = [
      {
        type: 'GetMany',
        method: 'pre',
        callback: jest.fn(),
        options: { query: false },
      },
      {
        type: 'CreateMany',
        method: 'post',
        callback: jest.fn(),
        options: { document: false },
      },
      {
        type: 'ReplaceOne',
        method: 'pre',
        callback: jest.fn(),
      },
    ];

    beforeEach(() => {
      const mock = buildDynamicApiModuleOptionsMock({}, {
        // @ts-ignore
        hooks,
      }, true);
      entity = mock.entity;
      jest.spyOn(SchemaFactory, 'createForClass').mockReturnValueOnce(mock.fakeSchema);
    });

    it('should build schema with hooks if provided', () => {
      const schema = buildSchemaFromEntity(entity);

      expect(schema.pre).toHaveBeenCalledTimes(2);
      expect(schema.pre).toHaveBeenNthCalledWith(
        1, 'find', { document: true, query: false }, hooks[0].callback,
      );
      expect(schema.pre)
      .toHaveBeenNthCalledWith(
        2, 'findOneAndReplace', { document: true, query: true }, hooks[2].callback,
      );

      expect(schema.post).toHaveBeenCalledTimes(1);
      expect(schema.post).toHaveBeenCalledWith(
        'save', { document: false, query: true }, hooks[1].callback,
      );
    });
  });
});
