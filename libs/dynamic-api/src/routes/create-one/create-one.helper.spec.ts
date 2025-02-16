import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { CreateOneService } from './create-one-service.interface';
import { createCreateOneController, createCreateOneGateway, createCreateOneServiceProvider } from './create-one.helper';

describe('CreateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createCreateOneServiceProvider', () => {
    it('should return CreateOne provider', () => {
      const { provide, useClass } = createCreateOneServiceProvider(entity, displayedName, '1', undefined, undefined);
      const service = new useClass(model);

      expect(provide).toBe(`CreateOne${displayedName}V1Service`);
      expect(useClass.name).toBe(`CreateOne${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createCreateOneController', () => {
    it('should return CreateOne controller', () => {
      const controllerClass = createCreateOneController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'CreateOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`CreateOne${displayedName}V1Controller`);
    });

    it('should instantiate CreateOne controller with default values', async () => {
      const service = {
        createOne: jest.fn(),
      };
      const controllerClass = createCreateOneController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'CreateOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceCreateOne = jest.spyOn(service, 'createOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.createOne({ unit: 'test' });

      expect(spyServiceCreateOne).toHaveBeenCalledWith({ unit: 'test' });
    });
  });

  describe('createCreateOneGateway', () => {
    it('should instantiate CreateOne gateway with default values', async () => {
      const gatewayClass = createCreateOneGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'CreateOne' },
      );

      const service = createMock<CreateOneService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
