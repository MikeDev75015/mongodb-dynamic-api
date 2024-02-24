import {
  createDuplicateOneController,
  createDuplicateOneServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';

describe('DuplicateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDuplicateOneServiceProvider', () => {
    it('should return DuplicateOne provider', () => {
      const { provide, useClass } = createDuplicateOneServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`DuplicateOne${entity.name}Service`);
      expect(useClass.name).toBe(`DuplicateOne${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDuplicateOneController', () => {
    it('should return DuplicateOne controller', () => {
      const controllerClass = createDuplicateOneController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`DuplicateOne${entity.name}Controller`);
    });

    it('should instantiate DuplicateOne controller with default values', async () => {
      const { useClass } = createDuplicateOneServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createDuplicateOneController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceDuplicateOne = jest.spyOn(service, 'duplicateOne');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.duplicateOne('test', { unit: 'test' });

      expect(spyServiceDuplicateOne).toHaveBeenCalledWith('test', {
        unit: 'test',
      });
    });
  });
});
