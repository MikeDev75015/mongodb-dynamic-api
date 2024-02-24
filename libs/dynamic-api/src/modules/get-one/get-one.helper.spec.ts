import {
  createGetOneController,
  createGetOneServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';

describe('GetOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createGetOneServiceProvider', () => {
    it('should return GetOne provider', () => {
      const { provide, useClass } = createGetOneServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`GetOne${entity.name}Service`);
      expect(useClass.name).toBe(`GetOne${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createGetOneController', () => {
    it('should return GetOne controller', () => {
      const controllerClass = createGetOneController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`GetOne${entity.name}Controller`);
    });

    it('should instantiate GetOne controller with default values', async () => {
      const { useClass } = createGetOneServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createGetOneController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceGetOne = jest.spyOn(service, 'getOne');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.getOne('test');

      expect(spyServiceGetOne).toHaveBeenCalledWith('test');
    });
  });
});
