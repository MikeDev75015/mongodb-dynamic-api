import {
  createCreateManyController,
  createCreateManyServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../../../test/__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../../../test/__mocks__/model.mock';

describe('CreateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateManyServiceProvider', () => {
    it('should return CreateMany provider', () => {
      const { provide, useClass } = createCreateManyServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`CreateMany${entity.name}Service`);
      expect(useClass.name).toBe(`CreateMany${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createCreateManyController', () => {
    it('should return CreateMany controller', () => {
      const controllerClass = createCreateManyController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`CreateMany${entity.name}Controller`);
    });

    it('should instantiate CreateMany controller with default values', async () => {
      const { useClass } = createCreateManyServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createCreateManyController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceCreateMany = jest.spyOn(service, 'createMany');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.createMany<{ list: any[] }>({ list: [{ unit: 'test' }] });

      expect(spyServiceCreateMany).toHaveBeenCalledWith([{ unit: 'test' }]);
    });
  });
});
