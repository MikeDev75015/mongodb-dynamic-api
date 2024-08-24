import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { ReplaceOneService } from './replace-one-service.interface';
import {
  createReplaceOneController,
  createReplaceOneGateway,
  createReplaceOneServiceProvider,
} from './replace-one.helper';

describe('ReplaceOneHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createReplaceOneServiceProvider', () => {
    it('should return ReplaceOne provider', () => {
      const { provide, useClass } = createReplaceOneServiceProvider(entity, displayedName, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`ReplaceOne${displayedName}V1Service`);
      expect(useClass.name).toBe(`ReplaceOne${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createReplaceOneController', () => {
    it('should return ReplaceOne controller', () => {
      const controllerClass = createReplaceOneController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'ReplaceOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`ReplaceOne${displayedName}V1Controller`);
    });

    it('should instantiate ReplaceOne controller with default values', async () => {
      const service = {
        replaceOne: jest.fn(),
      };
      const controllerClass = createReplaceOneController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'ReplaceOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceReplaceOne = jest.spyOn(service, 'replaceOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.replaceOne('test', { unit: 'test' });

      expect(spyServiceReplaceOne).toHaveBeenCalledWith('test', {
        unit: 'test',
      });
    });
  });

  describe('createReplaceOneGateway', () => {
    it('should instantiate ReplaceOne gateway with default values', async () => {
      const gatewayClass = createReplaceOneGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'ReplaceOne' },
      );

      const service = createMock<ReplaceOneService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
