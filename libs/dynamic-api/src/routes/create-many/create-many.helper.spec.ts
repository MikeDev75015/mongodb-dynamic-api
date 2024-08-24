import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { CreateManyService } from './create-many-service.interface';
import {
  createCreateManyController,
  createCreateManyGateway,
  createCreateManyServiceProvider,
} from './create-many.helper';

describe('CreateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateManyServiceProvider', () => {
    it('should return CreateMany provider', () => {
      const { provide, useClass } = createCreateManyServiceProvider(entity, displayedName, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`CreateMany${displayedName}V1Service`);
      expect(useClass.name).toBe(`CreateMany${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createCreateManyController', () => {
    it('should return CreateMany controller', () => {
      const controllerClass = createCreateManyController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'CreateMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`CreateMany${displayedName}V1Controller`);
    });

    it('should instantiate CreateMany controller with default values', async () => {
      const service = {
        createMany: jest.fn(),
      };
      const controllerClass = createCreateManyController(
        entity,
        displayedName,
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

  describe('createCreateManyGateway', () => {
    it('should instantiate CreateMany gateway with default values', async () => {
      const gatewayClass = createCreateManyGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'CreateMany' },
      );

      const service = createMock<CreateManyService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
