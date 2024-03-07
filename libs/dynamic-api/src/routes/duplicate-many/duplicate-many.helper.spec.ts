import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createDuplicateManyController, createDuplicateManyServiceProvider } from './duplicate-many.helper';

describe('DuplicateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDuplicateManyServiceProvider', () => {
    it('should return DuplicateMany provider', () => {
      const { provide, useClass } = createDuplicateManyServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`DuplicateMany${entity.name}V1Service`);
      expect(useClass.name).toBe(`DuplicateMany${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDuplicateManyController', () => {
    it('should return DuplicateMany controller', () => {
      const controllerClass = createDuplicateManyController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DuplicateMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DuplicateMany${entity.name}V1Controller`);
    });

    it('should instantiate DuplicateMany controller with default values', async () => {
      const { useClass } = createDuplicateManyServiceProvider(entity, undefined);
      const service = new useClass(model);
      const controllerClass = createDuplicateManyController(
        entity,
        { path: 'path' },
        { type: 'DuplicateMany' },
      );
      const controller = new controllerClass(service);
      const spyServiceDuplicateMany = jest.spyOn(service, 'duplicateMany');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.duplicateMany(['test', 'test2'], { unit: 'test' });

      expect(spyServiceDuplicateMany).toHaveBeenCalledWith(['test', 'test2'], {
        unit: 'test',
      });
    });
  });
});
