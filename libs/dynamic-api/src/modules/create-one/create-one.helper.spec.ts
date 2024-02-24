import {
  createCreateOneController,
  createCreateOneServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../../../test/__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../../../test/__mocks__/model.mock';

describe('CreateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateOneServiceProvider', () => {
    it('should return CreateOne provider', () => {
      const { provide, useClass } = createCreateOneServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`CreateOne${entity.name}Service`);
      expect(useClass.name).toBe(`CreateOne${entity.name}Service`);
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

      expect(controllerClass.name).toBe(`CreateOne${entity.name}Controller`);
    });

    it('should instantiate CreateOne controller with default values', async () => {
      const { useClass } = createCreateOneServiceProvider(entity);
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
