import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createGetManyController, createGetManyServiceProvider } from './get-many.helper';

describe('GetManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createGetManyServiceProvider', () => {
    it('should return GetMany provider', () => {
      const { provide, useClass } = createGetManyServiceProvider(entity, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`GetMany${entity.name}V1Service`);
      expect(useClass.name).toBe(`GetMany${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createGetManyController', () => {
    it('should return GetMany controller', () => {
      const controllerClass = createGetManyController(
        entity,
        { path: 'path', apiTag: 'apiTag' },
        { type: 'GetMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`GetMany${entity.name}V1Controller`);
    });

    it('should instantiate GetMany controller with default values', async () => {
      const service = {
        getMany: jest.fn(),
      };
      const controllerClass = createGetManyController(entity, { path: 'path' }, { type: 'GetMany' });
      const controller = new controllerClass(service);
      const spyServiceGetMany = jest.spyOn(service, 'getMany');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.getMany({ limit: 1, page: 1 });

      expect(spyServiceGetMany).toHaveBeenCalledWith({ limit: 1, page: 1 });
    });
  });
});
