import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createUpdateOneController, createUpdateOneServiceProvider } from './update-one.helper';

describe('UpdateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createUpdateOneServiceProvider', () => {
    it('should return UpdateOne provider', () => {
      const { provide, useClass } = createUpdateOneServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`UpdateOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`UpdateOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createUpdateOneController', () => {
    it('should return UpdateOne controller', () => {
      const controllerClass = createUpdateOneController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'UpdateOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`UpdateOne${entity.name}V1Controller`);
    });

    it('should instantiate UpdateOne controller with default values', async () => {
      const { useClass } = createUpdateOneServiceProvider(entity, undefined);
      const service = new useClass(model);
      const controllerClass = createUpdateOneController(
        entity,
        { path: 'path' },
        { type: 'UpdateOne' },
      );
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
