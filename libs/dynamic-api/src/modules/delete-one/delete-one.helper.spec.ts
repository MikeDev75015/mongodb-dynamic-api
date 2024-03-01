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
      const { provide, useClass } = createDeleteOneServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`DeleteOne${entity.name}Service`);
      expect(useClass.name).toBe(`DeleteOne${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDeleteOneController', () => {
    it('should return DeleteOne controller', () => {
      const controllerClass = createDeleteOneController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`DeleteOne${entity.name}Controller`);
    });

    it('should instantiate DeleteOne controller with default values', async () => {
      const { useClass } = createDeleteOneServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createDeleteOneController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceDeleteOne = jest.spyOn(service, 'deleteOne');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.deleteOne('test');

      expect(spyServiceDeleteOne).toHaveBeenCalledWith('test');
    });
  });
});
