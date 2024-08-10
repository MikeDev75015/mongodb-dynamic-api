import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { DuplicateOneService } from './duplicate-one-service.interface';
import {
  createDuplicateOneController,
  createDuplicateOneGateway,
  createDuplicateOneServiceProvider,
} from './duplicate-one.helper';

describe('DuplicateOneHelper', () => {
  let entity: Type;
  let model: Model<any>;

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDuplicateOneServiceProvider', () => {
    it('should return DuplicateOne provider', () => {
      const { provide, useClass } = createDuplicateOneServiceProvider(entity, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`DuplicateOne${entity.name}V1Service`);
      expect(useClass.name).toBe(`DuplicateOne${entity.name}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDuplicateOneController', () => {
    it('should return DuplicateOne controller', () => {
      const controllerClass = createDuplicateOneController(
        entity,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DuplicateOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DuplicateOne${entity.name}V1Controller`);
    });

    it('should instantiate DuplicateOne controller with default values', async () => {
      const service = {
        duplicateOne: jest.fn(),
      };
      const controllerClass = createDuplicateOneController(
        entity,
        { path: 'path' },
        { type: 'DuplicateOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceDuplicateOne = jest.spyOn(service, 'duplicateOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.duplicateOne('test', { unit: 'test' });

      expect(spyServiceDuplicateOne).toHaveBeenCalledWith('test', {
        unit: 'test',
      });
    });
  });

  describe('createDuplicateOneGateway', () => {
    it('should instantiate DuplicateOne gateway with default values', async () => {
      const gatewayClass = createDuplicateOneGateway(
        entity,
        { path: 'path' },
        { type: 'DuplicateOne' },
      );

      const service = createMock<DuplicateOneService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
