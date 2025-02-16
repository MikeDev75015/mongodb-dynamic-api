import { createMock } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { AggregateController } from './aggregate-controller.interface';
import { AggregateControllerMixin } from './aggregate-controller.mixin';
import { AggregateService } from './aggregate-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('AggregateControllerMixin', () => {
  let controller: AggregateController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'Aggregate' };
  const version = '1';
  const service = createMock<AggregateService<Entity>>();
  const fakeEntities = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }] as Entity[];

  class QueryWithStatic {
    name: string;

    static toPipeline(_: QueryWithStatic): PipelineStage[] {
      return [{ $match: { name: _.name } }];
    }
  }

  class QueryWithoutStatic {
    name: string;
  }

  class EmptyQuery {
    static toPipeline(_: EmptyQuery): PipelineStage[] {
      return [];
    }
  }

  const query = { name: 'test' };

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends AggregateControllerMixin(
      Entity,
      controllerOptions,
      _routeConfig,
      version,
    ) {
      constructor() {
        super(service);
      }
    }

    return new Controller();
  };

  beforeEach(() => {
    service.aggregate.mockResolvedValueOnce({
      list: fakeEntities,
      count: fakeEntities.length,
      totalPage: 1,
    });
  });

  it('should create controller', () => {
    controller = initController({ ...routeConfig, dTOs: { query: QueryWithStatic } });
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should throw an exception if query DTO is not provided', () => {
    expect(() => initController(routeConfig)).toThrow(
      new BadRequestException('Query DTO is required'),
    );
  });

  it('should throw an exception if query is empty', async () => {
    controller = initController({ ...routeConfig, dTOs: { query: EmptyQuery } });

    await expect(controller.aggregate({})).rejects.toThrow(
      new BadRequestException('Invalid pipeline, no stages found'),
    );
  });

  it('should throw an exception if query DTO does not have toPipeline method', async () => {
    controller = initController({ ...routeConfig, dTOs: { query: QueryWithoutStatic } });

    await expect(controller.aggregate(query)).rejects.toThrow(
      new BadRequestException('Query DTO must have toPipeline static method'),
    );
  });

  it('should call service.aggregate and return response', async () => {
    controller = initController({ ...routeConfig, dTOs: { query: QueryWithStatic } });

    await expect(controller.aggregate(query)).resolves.toEqual(fakeEntities);
    expect(service.aggregate).toHaveBeenCalledTimes(1);
    expect(service.aggregate).toHaveBeenCalledWith([{ $match: { name: query.name } }]);
  });

  it('should map to response if presenter dto has fromAggregate method', async () => {
    class RoutePresenter {
      count: number;

      data: { ref: string; fullName: string }[];

      static fromAggregate(_: Entity[], count: number, totalPage: number): RoutePresenter {
        return {
          count: _.length,
          data: _.map(e => ({ ref: e.id, fullName: e.name })),
        };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { query: QueryWithStatic, presenter: RoutePresenter } });
    const presenter = {
      count: 2,
      data: [{ ref: '1', fullName: 'test' }, { ref: '2', fullName: 'unit' }],
    };

    await expect(controller.aggregate(query)).resolves.toEqual(presenter);
    expect(service.aggregate).toHaveBeenCalledTimes(1);
    expect(service.aggregate).toHaveBeenCalledWith([{ $match: { name: query.name } }]);
  });
});
