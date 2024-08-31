import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildDynamicApiModuleOptionsMock } from '../../../__mocks__/dynamic-api.module.mock';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { AggregateService } from './aggregate-service.interface';
import {
  createAggregateController,
  createAggregateGateway,
  createAggregateServiceProvider,
} from './aggregate.helper';

describe('AggregateHelper', () => {
  let entity: Type;
  let model: Model<any>;
  const displayedName = 'DisplayedName';

  class Query {
    name: string;

    static toPipeline(query: Query): any[] {
      return [{ $match: { name: query.name } }];
    }
  }

  beforeEach(() => {
    entity = buildDynamicApiModuleOptionsMock().entity;
    model = buildModelMock();
  });

  describe('createAggregateServiceProvider', () => {
    it('should return Aggregate provider', () => {
      const { provide, useClass } = createAggregateServiceProvider(entity, displayedName, '1', undefined);
      const service = new useClass(model);

      expect(provide).toBe(`Aggregate${displayedName}V1Service`);
      expect(useClass.name).toBe(`Aggregate${displayedName}V1Service`);
      expect(service.entity).toBe(entity);
    });
  });

  describe('createAggregateController', () => {
    it('should return Aggregate controller', () => {
      const controllerClass = createAggregateController(
        entity,
        displayedName,
        {
          path: 'path',
          apiTag: 'apiTag',
        },
        { type: 'Aggregate', description: 'description', dTOs: { query: Query } },
        '1',
      );

      expect(controllerClass.name).toBe(`Aggregate${displayedName}V1Controller`);
    });

    it('should instantiate Aggregate controller with default values', async () => {
      const service = {
        aggregate: jest.fn(),
      };
      const controllerClass = createAggregateController(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'Aggregate', dTOs: { query: Query } },
      );
      const controller = new controllerClass(service);

      expect(controller).toBeDefined();
      expect(controller['service']).toBe(service);
    });
  });

  describe('createAggregateGateway', () => {
    it('should instantiate Aggregate gateway with default values', async () => {
      const gatewayClass = createAggregateGateway(
        entity,
        displayedName,
        { path: 'path' },
        { type: 'Aggregate', dTOs: { query: Query } },
      );

      const service = createMock<AggregateService<any>>();
      const jwtService = createMock<JwtService>();

      const gateway = new gatewayClass(service, jwtService);

      expect(gateway).toBeDefined();
    });
  });
});
