import { BadRequestException, Type } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyController } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyService } from './create-many-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('CreateManyControllerMixin', () => {
  let controller: CreateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateMany' };
  const version = '1';

  const service = {
    createMany: jest.fn(),
  } as CreateManyService<Entity>;

  const initController = (
    _entity: Type<Entity>,
    _controllerOptions: DynamicApiControllerOptions<Entity>,
    _routeConfig: DynamicAPIRouteConfig<Entity>,
    _version?: string,
  ) => {
    class Controller extends CreateManyControllerMixin(
      _entity,
      _controllerOptions,
      _routeConfig,
      _version,
    ) {
      constructor() {
        super(service);
      }
    }

    return new Controller();
  };

  it('should create a controller', () => {
    expect(initController(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    )).toBeDefined();
  });

  test.each([
    ['body is empty', {} as any],
    ['list is not in the body', { field1: 'test' } as any],
    ['list is not an array', { list: '1' } as any],
    ['list is empty', { list: [] } as any],
    ['list is invalid', { list: [{ name: 'test invalid' }, true] } as any],
  ])('should throw an exception if %s', async (_, body) => {
    controller = initController(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    );

    await expect(controller.createMany(body)).rejects.toThrow(
      new BadRequestException('Invalid request body'),
    );
  });

  it('should call service.createMany and return response', async () => {
    controller = initController(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    );

    const fakeResponse = [{ id: 1 }, { id: 2 }];

    service.createMany = jest.fn().mockResolvedValueOnce(fakeResponse);

    const body = { list: [{ name: 'name 1' }, { name: 'name 2' }] };

    await expect(controller.createMany(body)).resolves.toEqual(fakeResponse);
    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });

  it('should map body to entities if body dto has toEntities method', async () => {
    class RouteBody {
      list: { name: string }[];

      static toEntities(body: RouteBody): Partial<Entity>[] {
        return body.list.map((e, i) => ({ name: `${i} - ${e.name}` }));
      }
    }

    controller = initController(
      Entity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: RouteBody } },
      version,
    );

    const fakeResponse = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }];

    service.createMany = jest.fn().mockResolvedValueOnce(fakeResponse);

    const body = { list: [{ name: 'test' }, { name: 'unit' }] };
    const expectedArg = [{ name: '0 - test' }, { name: '1 - unit' }];

    await expect(controller.createMany(body)).resolves.toEqual(fakeResponse);
    expect(service.createMany).toHaveBeenCalledTimes(1);
    expect(service.createMany).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class RoutePresenter {
      count: number;

      data: { ref: string; fullName: string }[];

      static fromEntities(entities: Entity[]): RoutePresenter {
        return {
          count: entities.length,
          data: entities.map(e => ({ ref: e.id, fullName: e.name })),
        };
      }
    }

    controller = initController(
      Entity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: RoutePresenter } },
      version,
    );

    const fakeResponse = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }];

    service.createMany = jest.fn().mockResolvedValueOnce(fakeResponse);

    const body = { list: [{ name: 'test' }, { name: 'unit' }] };
    const expectedResponse = {
      count: 2,
      data: [{ ref: '1', fullName: 'test' }, { ref: '2', fullName: 'unit' }],
    };

    await expect(controller.createMany(body)).resolves.toEqual(expectedResponse);
    expect(service.createMany).toHaveBeenCalledTimes(1);
    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });
});
