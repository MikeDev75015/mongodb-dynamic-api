import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { DuplicateManyService } from './duplicate-many-service.interface';
import {
  createDuplicateManyController,
  createDuplicateManyGateway,
  createDuplicateManyServiceProvider,
} from './duplicate-many.helper';

describe('DuplicateManyHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDuplicateManyServiceProvider', () => {
    it('should return DuplicateMany provider', () => {
      const { provide, useClass } = createDuplicateManyServiceProvider(entity, displayedName, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`DuplicateMany${displayedName}V1Service`);
      expect(useClass.name).toBe(`DuplicateMany${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createDuplicateManyController', () => {
    it('should return DuplicateMany controller', () => {
      const controllerClass = createDuplicateManyController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DuplicateMany', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DuplicateMany${displayedName}V1Controller`);
    });

    it('should instantiate DuplicateMany controller with default values', async () => {
      const service = {
        duplicateMany: jest.fn(),
      };
      const controllerClass = createDuplicateManyController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DuplicateMany' },
      );
      const controller = new controllerClass(service);
      const spyServiceDuplicateMany = jest.spyOn(service, 'duplicateMany');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.duplicateMany(['test', 'test2'], { unit: 'test' });

      expect(spyServiceDuplicateMany).toHaveBeenCalledWith(['test', 'test2'], {
        unit: 'test',
      });
    });
  });

  describe('createDuplicateManyGateway', () => {
    it('should instantiate DuplicateMany gateway with default values', async () => {
      const gatewayClass = createDuplicateManyGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DuplicateMany' },
      );

      const service = createMock<DuplicateManyService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
