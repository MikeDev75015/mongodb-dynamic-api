import { createMock } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
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
  const service = createMock<CreateManyService<Entity>>();
  const fakeEntities = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }] as Entity[];

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends CreateManyControllerMixin(
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
    service.createMany.mockResolvedValueOnce(fakeEntities);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  test.each([
    ['body is empty', {} as any],
    ['list is not in the body', { field1: 'test' } as any],
    ['list is not an array', { list: '1' } as any],
    ['list is empty', { list: [] } as any],
    ['list is invalid', { list: [{ name: 'test invalid' }, true] } as any],
  ])('should throw an exception if %s', async (_, body) => {
    controller = initController();

    await expect(controller.createMany(body)).rejects.toThrow(
      new BadRequestException('Invalid request body'),
    );
  });

  it('should call service.createMany and return response', async () => {
    controller = initController();
    const body = { list: [{ name: 'name 1' }, { name: 'name 2' }] };

    await expect(controller.createMany(body)).resolves.toEqual(fakeEntities);
    expect(service.createMany).toHaveBeenCalledTimes(1);
    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });

  it('should map body to entities if body dto has toEntities method', async () => {
    class RouteBody {
      list: { name: string }[];

      static toEntities(_: RouteBody): Partial<Entity>[] {
        return _.list.map((e, i) => ({ name: `${i} - ${e.name}` }));
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: RouteBody } });
    const body = { list: [{ name: 'test' }, { name: 'unit' }] };
    const expectedArg = [{ name: '0 - test' }, { name: '1 - unit' }];

    await expect(controller.createMany(body)).resolves.toEqual(fakeEntities);
    expect(service.createMany).toHaveBeenCalledTimes(1);
    expect(service.createMany).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class RoutePresenter {
      count: number;

      data: { ref: string; fullName: string }[];

      static fromEntities(_: Entity[]): RoutePresenter {
        return {
          count: _.length,
          data: _.map(e => ({ ref: e.id, fullName: e.name })),
        };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: RoutePresenter } });
    const body = { list: [{ name: 'test' }, { name: 'unit' }] };
    const presenter = {
      count: 2,
      data: [{ ref: '1', fullName: 'test' }, { ref: '2', fullName: 'unit' }],
    };

    await expect(controller.createMany(body)).resolves.toEqual(presenter);
    expect(service.createMany).toHaveBeenCalledTimes(1);
    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });
});
