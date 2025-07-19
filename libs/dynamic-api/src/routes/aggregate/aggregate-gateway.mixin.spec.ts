import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { AggregateGatewayConstructor } from './aggregate-gateway.interface';
import { AggregateGatewayMixin } from './aggregate-gateway.mixin';
import { AggregateService } from './aggregate-service.interface';

describe('AggregateGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let AggregateGateway: AggregateGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<AggregateService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'Aggregate',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { field1: 'test' } as TestEntity;

  class DataWithStatic {
    name: string;

    static toPipeline(_: DataWithStatic): PipelineStage[] {
      return [{ $match: { name: _.name } }];
    }
  }

  class DataWithoutStatic {
    name: string;
  }

  const data = { name: 'test' };

  it('should return a class that extends BaseGateway and implements AggregateGateway', () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { query: DataWithStatic } },
    );

    expect(AggregateGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(AggregateGateway.name).toBe('BaseAggregateTestEntityGateway');
  });

  it('should throw an exception if query DTO is not provided', () => {
    expect(() => AggregateGatewayMixin(TestEntity, controllerOptions, routeConfig)).toThrow(
      new WsException('Query DTO is required'),
    );
  });

  it('should not throw an exception if data is empty', async () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { query: DataWithStatic } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    await expect(aggregateGateway.aggregate(socket, {})).resolves.not.toThrow();
  });

  it('should throw an exception if query DTO does not have toPipeline method', async () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { query: DataWithoutStatic } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    await expect(aggregateGateway.aggregate(socket, data)).rejects.toThrow(
      new WsException('Query DTO must have toPipeline static method'),
    );
  });

  it('should call the service and return event and data', async () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { query: DataWithStatic } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    service.aggregate.mockResolvedValueOnce({
      list: [fakeEntity],
      count: 1,
      totalPage: 1,
    });

    await expect(aggregateGateway.aggregate(socket, data)).resolves.toEqual({
      event: 'aggregate-test-entity',
      data: [fakeEntity],
    });

    expect(service.aggregate).toHaveBeenCalledWith([{ $match: { name: data.name } }]);
  });

  it('should use eventName from routeConfig if provided', async () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event', dTOs: { query: DataWithStatic } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    service.aggregate.mockResolvedValueOnce({
      list: [],
      count: 0,
      totalPage: 0,
    });

    await expect(aggregateGateway.aggregate(socket, data)).resolves.toEqual({
      event: 'custom-event',
      data: [],
    });
  });

  it('should use subPath in eventName if provided', async () => {
    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub', dTOs: { query: DataWithStatic } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    service.aggregate.mockResolvedValueOnce({
      list: [],
      count: 0,
      totalPage: 0,
    });

    await expect(aggregateGateway.aggregate(socket, data)).resolves.toEqual({
      event: 'aggregate-sub-test-entity',
      data: [],
    });
  });

  it('should map entities to response if presenter dto has fromAggregate method', async () => {
    class RoutePresenter {
      count: number;

      data: { ref: string; fullName: string }[];

      static fromAggregate(_: TestEntity[], count: number): RoutePresenter {
        return {
          count,
          data: _.map(e => ({ ref: e.id, fullName: e.field1 })),
        };
      }
    }

    AggregateGateway = AggregateGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { query: DataWithStatic, presenter: RoutePresenter } },
    );

    const aggregateGateway = new AggregateGateway(service, jwtService);

    const fakeResponse = [{ id: '1', field1: 'test' }, { id: '2', field1: 'unit' }] as TestEntity[];

    service.aggregate.mockResolvedValueOnce({
      list: fakeResponse,
      count: fakeResponse.length,
      totalPage: 1,
    });

    const expectedResponse = {
      count: 2,
      data: [{ ref: '1', fullName: 'test' }, { ref: '2', fullName: 'unit' }],
    };

    await expect(aggregateGateway.aggregate(socket, data)).resolves.toEqual({
      event: 'aggregate-test-entity',
      data: expectedResponse,
    });
    expect(service.aggregate).toHaveBeenCalledWith([{ $match: { name: data.name } }]);
  });
});
