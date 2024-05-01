import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createGetOneController, createGetOneServiceProvider } from './get-one.helper';

describe('GetOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createGetOneServiceProvider', () => {
    it('should return GetOne provider', () => {
      const { provide, useClass } = createGetOneServiceProvider(entity, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`GetOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`GetOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createGetOneController', () => {
    it('should return GetOne controller', () => {
      const controllerClass = createGetOneController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'GetOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`GetOne${entity.name}V1Controller`);
    });

    it('should instantiate GetOne controller with default values', async () => {
      const service = {
        getOne: jest.fn(),
      };
      const controllerClass = createGetOneController(
        entity,
        { path: 'path' },
        { type: 'GetOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceGetOne = jest.spyOn(service, 'getOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.getOne('test');

      expect(spyServiceGetOne).toHaveBeenCalledWith('test');
    });
  });
});
