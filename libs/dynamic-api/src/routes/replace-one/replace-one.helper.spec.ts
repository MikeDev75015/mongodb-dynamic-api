import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createReplaceOneController, createReplaceOneServiceProvider } from './replace-one.helper';

describe('ReplaceOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createReplaceOneServiceProvider', () => {
    it('should return ReplaceOne provider', () => {
      const { provide, useClass } = createReplaceOneServiceProvider(entity, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`ReplaceOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`ReplaceOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createReplaceOneController', () => {
    it('should return ReplaceOne controller', () => {
      const controllerClass = createReplaceOneController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'ReplaceOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`ReplaceOne${entity.name}V1Controller`);
    });

    it('should instantiate ReplaceOne controller with default values', async () => {
      const service = {
        replaceOne: jest.fn(),
      };
      const controllerClass = createReplaceOneController(
        entity,
        { path: 'path' },
        { type: 'ReplaceOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceReplaceOne = jest.spyOn(service, 'replaceOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.replaceOne('test', { unit: 'test' });

      expect(spyServiceReplaceOne).toHaveBeenCalledWith('test', {
        unit: 'test',
      });
    });
  });
});
