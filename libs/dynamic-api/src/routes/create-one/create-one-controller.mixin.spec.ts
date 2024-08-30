import { createMock } from '@golevelup/ts-jest';
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
  const service = createMock<CreateOneService<Entity>>();
  const fakeEntity = { id: '1', name: 'test' } as Entity;

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends CreateOneControllerMixin(
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
    service.createOne.mockResolvedValueOnce(fakeEntity);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.createOne and return response', async () => {
    controller = initController();
    const body = { name: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(fakeEntity);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class CreateOneBody {
      fullName: string;

      static toEntity(_: CreateOneBody) {
        return { name: _.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: CreateOneBody } });
    const body = { fullName: 'test' };
    const expectedArg = { name: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(fakeEntity);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class CreateOnePresenter {
      ref: string;
      fullName: string;

      static fromEntity(_: Entity): CreateOnePresenter {
        return { ref: _.id, fullName: _.name };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: CreateOnePresenter } });
    const body = { name: 'test' };
    const presenter = { ref: '1', fullName: 'test' };

    await expect(controller.createOne(body)).resolves.toEqual(presenter);
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(body);
  });
});
