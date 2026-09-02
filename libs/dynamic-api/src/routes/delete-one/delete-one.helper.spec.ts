import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { createMock } from '@test-helpers';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { DeleteOneService } from './delete-one-service.interface';
import { createDeleteOneController, createDeleteOneGateway, createDeleteOneServiceProvider } from './delete-one.helper';

describe('DeleteOneHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createDeleteOneServiceProvider', () => {
    it('should return DeleteOne provider', () => {
      const { provide, useClass } = createDeleteOneServiceProvider(entity, displayedName, '1', undefined, undefined);
      const service = new useClass(model);

      expect(provide).toBe(`DeleteOne${displayedName}V1Service`);
      expect(useClass.name).toBe(`DeleteOne${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });

    it('should wire beforeDeleteCallback and cascade into the service', () => {
      const beforeDeleteCallback = vi.fn();
      const cascade = [{ entity, foreignKey: 'parentId', on: 'delete' as const }];

      const { useClass } = createDeleteOneServiceProvider(
        entity, displayedName, '1', undefined, undefined, beforeDeleteCallback, cascade,
      );
      const service = new useClass(model) as { beforeDeleteCallback: unknown; cascade: unknown };

      expect(service.beforeDeleteCallback).toBe(beforeDeleteCallback);
      expect(service.cascade).toBe(cascade);
    });
  });

  describe('createDeleteOneController', () => {
    it('should return DeleteOne controller', () => {
      const controllerClass = createDeleteOneController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'DeleteOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`DeleteOne${displayedName}V1Controller`);
    });

    it('should instantiate DeleteOne controller with default values', async () => {
      const service = {
        deleteOne: vi.fn(),
      };
      const controllerClass = createDeleteOneController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DeleteOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceDeleteOne = vi.spyOn(service, 'deleteOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.deleteOne('test');

      expect(spyServiceDeleteOne).toHaveBeenCalledWith('test', undefined);
    });
  });

  describe('createDeleteOneGateway', () => {
    it('should instantiate DeleteOne gateway with default values', async () => {
      const gatewayClass = createDeleteOneGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'DeleteOne' },
      );

      const service = createMock<DeleteOneService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
