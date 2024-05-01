import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createDeleteOneController, createDeleteOneServiceProvider } from './delete-one.helper';

describe('DeleteOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDeleteOneServiceProvider', () => {
    it('should return DeleteOne provider', () => {
      const { provide, useClass } = createDeleteOneServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`DeleteOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`DeleteOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDeleteOneController', () => {
    it('should return DeleteOne controller', () => {
      const controllerClass = createDeleteOneController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DeleteOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DeleteOne${entity.name}V1Controller`);
    });

    it('should instantiate DeleteOne controller with default values', async () => {
      const service = {
        deleteOne: jest.fn(),
      };
      const controllerClass = createDeleteOneController(
        entity,
        { path: 'path' },
        { type: 'DeleteOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceDeleteOne = jest.spyOn(service, 'deleteOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.deleteOne('test');

      expect(spyServiceDeleteOne).toHaveBeenCalledWith('test');
    });
  });
});
