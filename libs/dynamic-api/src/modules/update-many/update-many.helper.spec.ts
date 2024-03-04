import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { createUpdateManyController, createUpdateManyServiceProvider } from './update-many.helper';

describe('UpdateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock({
      find: [[{ _id: '1' }, { _id: '2' }]],
    });
  });

  describe('createUpdateManyServiceProvider', () => {
    it('should return UpdateMany provider', () => {
      const { provide, useClass } = createUpdateManyServiceProvider(entity, '1');
      const service = new useClass(model);

      expect(provide).toBe(`UpdateMany${entity.name}V1Service`);
      expect(useClass.name).toBe(`UpdateMany${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createUpdateManyController', () => {
    it('should return UpdateMany controller', () => {
      const controllerClass = createUpdateManyController(
        entity,
        'path',
        'apiTag',
        '1',
        'description',
      );

      expect(controllerClass.name).toBe(`UpdateMany${entity.name}V1Controller`);
    });

    it('should instantiate UpdateMany controller with default values', async () => {
      const { useClass } = createUpdateManyServiceProvider(entity, undefined);
      const service = new useClass(model);
      const controllerClass = createUpdateManyController(entity, 'path');
      const controller = new controllerClass(service);
      const spyServiceUpdateMany = jest.spyOn(service, 'updateMany');
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.updateMany(['test', 'test2'], { unit: 'test' });

      expect(spyServiceUpdateMany).toHaveBeenCalledWith(['test', 'test2'], {
        unit: 'test',
      });
    });
  });
});
