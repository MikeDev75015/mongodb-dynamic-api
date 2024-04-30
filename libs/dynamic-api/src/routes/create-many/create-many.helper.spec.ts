import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createCreateManyController, createCreateManyServiceProvider } from './create-many.helper';

describe('CreateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateManyServiceProvider', () => {
    it('should return CreateMany provider', () => {
      const { provide, useClass } = createCreateManyServiceProvider(entity, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`CreateMany${entity.name}V1Service`);
      expect(useClass.name).toBe(`CreateMany${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createCreateManyController', () => {
    it('should return CreateMany controller', () => {
      const controllerClass = createCreateManyController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'CreateMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`CreateMany${entity.name}V1Controller`);
    });

    it('should instantiate CreateMany controller with default values', async () => {
      const { useClass } = createCreateManyServiceProvider(entity, undefined, undefined);
      const service = new useClass(model);
      const controllerClass = createCreateManyController(
        entity,
        { path: 'path' },
        { type: 'CreateMany' },
      );
      const controller = new controllerClass(service);
      const spyServiceCreateMany = jest.spyOn(service, 'createMany');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.createMany({ list: [{ unit: 'test' }] });

      expect(spyServiceCreateMany).toHaveBeenCalledWith([{ unit: 'test' }]);
    });
  });
});
