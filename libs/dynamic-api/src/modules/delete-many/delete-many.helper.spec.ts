import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createDeleteManyController, createDeleteManyServiceProvider } from './delete-many.helper';

describe('DeleteManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDeleteManyServiceProvider', () => {
    it('should return DeleteMany provider', () => {
      const { provide, useClass } = createDeleteManyServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`DeleteMany${entity.name}V1Service`);
      expect(useClass.name).toBe(`DeleteMany${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDeleteManyController', () => {
    it('should return DeleteMany controller', () => {
      const controllerClass = createDeleteManyController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`DeleteMany${entity.name}V1Controller`);
    });

    it('should instantiate DeleteMany controller with default values', async () => {
      const { useClass } = createDeleteManyServiceProvider(entity, undefined);
      const service = new useClass(model);
      const controllerClass = createDeleteManyController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceDeleteMany = jest.spyOn(service, 'deleteMany');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.deleteMany(['test', 'test2']);

      expect(spyServiceDeleteMany).toHaveBeenCalledWith(['test', 'test2']);
    });
  });
});
