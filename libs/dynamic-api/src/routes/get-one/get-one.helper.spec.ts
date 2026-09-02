import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { createMock } from '@test-helpers';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { GetOneService } from './get-one-service.interface';
import { createGetOneController, createGetOneGateway, createGetOneServiceProvider } from './get-one.helper';

describe('GetOneHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createGetOneServiceProvider', () => {
    it('should return GetOne provider', () => {
      const { provide, useClass } = createGetOneServiceProvider(entity, displayedName, '1', undefined, undefined);
      const service = new useClass(model);

      expect(provide).toBe(`GetOne${displayedName}V1Service`);
      expect(useClass.name).toBe(`GetOne${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
      expect(service.populate).toBeUndefined();
    });

    it('should pass populate through to the service', () => {
      const { useClass } = createGetOneServiceProvider(entity, displayedName, '1', undefined, 'author');
      const service = new useClass(model);

      expect(service.populate).toBe('author');
    });
  });

  describe('createGetOneController', () => {
    it('should return GetOne controller', () => {
      const controllerClass = createGetOneController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'GetOne', description: 'description' },
        '1',
      );

      expect(controllerClass.name).toBe(`GetOne${displayedName}V1Controller`);
    });

    it('should instantiate GetOne controller with default values', async () => {
      const service = {
        getOne: vi.fn(),
      };
      const controllerClass = createGetOneController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'GetOne' },
      );
      const controller = new controllerClass(service);
      const spyServiceGetOne = vi.spyOn(service, 'getOne');

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);

      await controller.getOne('test');

      expect(spyServiceGetOne).toHaveBeenCalledWith('test', undefined);
    });
  });

  describe('createGetOneGateway', () => {
    it('should instantiate GetOne gateway with default values', async () => {
      const gatewayClass = createGetOneGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'GetOne' },
      );

      const service = createMock<GetOneService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
