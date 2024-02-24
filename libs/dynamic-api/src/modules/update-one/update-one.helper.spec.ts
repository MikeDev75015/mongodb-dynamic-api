import {
  createUpdateOneController,
  createUpdateOneServiceProvider,
} from '@dynamic-api';
import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';

describe('UpdateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createUpdateOneServiceProvider', () => {
    it('should return UpdateOne provider', () => {
      const { provide, useClass } = createUpdateOneServiceProvider(entity);
      const service = new useClass(model);

      expect(provide).toBe(`UpdateOne${entity.name}Service`);
      expect(useClass.name).toBe(`UpdateOne${entity.name}Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createUpdateOneController', () => {
    it('should return UpdateOne controller', () => {
      const controllerClass = createUpdateOneController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`UpdateOne${entity.name}Controller`);
    });

    it('should instantiate UpdateOne controller with default values', async () => {
      const { useClass } = createUpdateOneServiceProvider(entity);
      const service = new useClass(model);
      const controllerClass = createUpdateOneController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceUpdateOne = jest.spyOn(service, 'updateOne');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.updateOne('test', { unit: 'test' });

      expect(spyServiceUpdateOne).toHaveBeenCalledWith('test', {
        unit: 'test',
      });
    });
  });
});
