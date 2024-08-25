import { Type } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneController } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneService } from './create-one-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('CreateOneControllerMixin', () => {
  let controller: CreateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateOne' };
  const version = '1';

  const service = {
    createOne: jest.fn(),
  } as CreateOneService<Entity>;

  const fakeServiceResponse = { id: '1', name: 'test' };

  const initController = (
    _entity: Type<Entity>,
    _controllerOptions: DynamicApiControllerOptions<Entity>,
    _routeConfig: DynamicAPIRouteConfig<Entity>,
    _version?: string,
  ) => {
    class Controller extends CreateOneControllerMixin(
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

  it('should create controller', () => {
    expect(initController(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    )).toBeDefined();
  });

  it('should call service.createOne and return response', async () => {
    controller = initController(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    );
    service.createOne = jest.fn().mockResolvedValueOnce(fakeServiceResponse);
    const body = { name: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(fakeServiceResponse);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class CreateOneBody {
      fullName: string;

      static toEntity(body: CreateOneBody) {
        return { name: body.fullName };
      }
    }

    controller = initController(
      Entity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: CreateOneBody } },
      version,
    );
    service.createOne = jest.fn().mockResolvedValueOnce(fakeServiceResponse);
    const body = { fullName: 'test' };
    const expectedArg = { name: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(fakeServiceResponse);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class CreateOnePresenter {
      ref: string;
      fullName: string;

      static fromEntity(entity: Entity): CreateOnePresenter {
        return { ref: entity.id, fullName: entity.name };
      }
    }

    controller = initController(
      Entity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: CreateOnePresenter } },
      version,
    );
    service.createOne = jest.fn().mockResolvedValueOnce(fakeServiceResponse);
    const body = { name: 'test' };
    const presenter = { ref: '1', fullName: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(presenter);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(body);
  });
});
