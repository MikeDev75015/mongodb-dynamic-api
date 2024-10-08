import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { DeleteManyService } from './delete-many-service.interface';
import {
  createDeleteManyController,
  createDeleteManyGateway,
  createDeleteManyServiceProvider,
} from './delete-many.helper';

describe('DeleteManyHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDeleteManyServiceProvider', () => {
    it('should return DeleteMany provider', () => {
      const { provide, useClass } = createDeleteManyServiceProvider(entity, displayedName, '1');
      const service = new useClass(model);

      expect(provide).toBe(`DeleteMany${displayedName}V1Service`);
      expect(useClass.name).toBe(`DeleteMany${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDeleteManyController', () => {
    it('should return DeleteMany controller', () => {
      const controllerClass = createDeleteManyController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DeleteMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DeleteMany${displayedName}V1Controller`);
    });

    it('should instantiate DeleteMany controller with default values', async () => {
      const service = {
        deleteMany: jest.fn(),
      };
      const controllerClass = createDeleteManyController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DeleteMany' },
      );
      const controller = new controllerClass(service);
      const spyServiceDeleteMany = jest.spyOn(service, 'deleteMany');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.deleteMany({ ids: ['test', 'test2'] });

      expect(spyServiceDeleteMany).toHaveBeenCalledWith(['test', 'test2']);
    });
  });

  describe('createDeleteManyGateway', () => {
    it('should instantiate DeleteMany gateway with default values', async () => {
      const gatewayClass = createDeleteManyGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DeleteMany' },
      );

      const service = createMock<DeleteManyService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
