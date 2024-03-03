import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createCreateOneController, createCreateOneServiceProvider } from './create-one.helper';

describe('CreateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateOneServiceProvider', () => {
    it('should return CreateOne provider', () => {
      const { provide, useClass } = createCreateOneServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`CreateOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`CreateOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createCreateOneController', () => {
    it('should return CreateOne controller', () => {
      const controllerClass = createCreateOneController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`CreateOne${entity.name}V1Controller`);
    });

    it('should instantiate CreateOne controller with default values', async () => {
      const { useClass } = createCreateOneServiceProvider(entity, undefined);
      const service = new useClass(model);
      const controllerClass = createCreateOneController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceCreateOne = jest.spyOn(service, 'createOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.createOne({ unit: 'test' });

      expect(spyServiceCreateOne).toHaveBeenCalledWith({ unit: 'test' });
    });
  });
});
