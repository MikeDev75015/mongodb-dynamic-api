import { beforeEach, describe, expect, it, test } from 'vitest';
import { createMock } from '@test-helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetOneController } from './get-one-controller.interface';
import { GetOneControllerMixin } from './get-one-controller.mixin';
import { GetOneService } from './get-one-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('GetOneControllerMixin', () => {
  let controller: GetOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetOne' };
  const version = '1';
  const service = createMock<GetOneService<Entity>>();
  const fakeEntity = { id: '1', name: 'test' } as Entity;

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends GetOneControllerMixin(
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
    service.getOne.mockResolvedValueOnce(fakeEntity);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.getOne and return response', async () => {
    controller = initController();
    const id = 'fakeId';

    await expect(controller.getOne(id)).resolves.toEqual(fakeEntity);
    expect(service.getOne).toHaveBeenCalledTimes(1);
    expect(service.getOne).toHaveBeenCalledWith(id, undefined);
  });

  it('should pass user from request to service.getOne', async () => {
    controller = initController();
    const id = 'fakeId';
    const fakeUser = { id: 'user-1', email: 'test@test.com' };

    await expect(controller.getOne(id, { user: fakeUser })).resolves.toEqual(fakeEntity);
    expect(service.getOne).toHaveBeenCalledTimes(1);
    expect(service.getOne).toHaveBeenCalledWith(id, fakeUser);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class GetOnePresenter {
      fullName: string;

      static fromEntity(_: Entity) {
        return { fullName: _.name };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: GetOnePresenter } });
    const id = 'fakeId';
    const expectedResponse = { fullName: 'test' };

    await expect(controller.getOne(id)).resolves.toEqual(expectedResponse);
    expect(service.getOne).toHaveBeenCalledTimes(1);
    expect(service.getOne).toHaveBeenCalledWith(id, undefined);
  });
});
