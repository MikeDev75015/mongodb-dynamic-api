import {
  createGetManyController,
  createGetManyServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../../../test/__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../../../test/__mocks__/model.mock';

describe('GetManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createGetManyServiceProvider', () => {
    it('should return GetMany provider', () => {
      const { provide, useClass } = createGetManyServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`GetMany${entity.name}Service`);
      expect(useClass.name).toBe(`GetMany${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createGetManyController', () => {
    it('should return GetMany controller', () => {
      const controllerClass = createGetManyController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`GetMany${entity.name}Controller`);
    });

    it('should instantiate GetMany controller with default values', async () => {
      const { useClass } = createGetManyServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createGetManyController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceGetMany = jest.spyOn(service, 'getMany');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.getMany({ limit: 1, page: 1 });

      expect(spyServiceGetMany).toHaveBeenCalledWith({ limit: 1, page: 1 });
    });
  });
});
