import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneController } from './replace-one-controller.interface';
import { ReplaceOneControllerMixin } from './replace-one-controller.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('ReplaceOneControllerMixin', () => {
  let controller: ReplaceOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'ReplaceOne' };
  const version = '1';
  const service = createMock<ReplaceOneService<Entity>>();
  const fakeEntity = { id: '1', name: 'test' } as Entity;

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends ReplaceOneControllerMixin(
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
    service.replaceOne.mockResolvedValueOnce(fakeEntity);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.replaceOne and return response', async () => {
    controller = initController();
    const id = 'fakeId';
    const body = {};

    await expect(controller.replaceOne(id, body)).resolves.toEqual(fakeEntity);
    expect(service.replaceOne).toHaveBeenCalledTimes(1);
    expect(service.replaceOne).toHaveBeenCalledWith(id, body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class ReplaceOneBody {
      fullName: string;

      static toEntity(_: ReplaceOneBody) {
        return { name: _.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: ReplaceOneBody } });
    const id = 'fakeId';
    const body = { fullName: 'test' };
    const expectedArg = { name: 'test' };

    await expect(controller.replaceOne(id, body)).resolves.toEqual(fakeEntity);
    expect(service.replaceOne).toHaveBeenCalledTimes(1);
    expect(service.replaceOne).toHaveBeenCalledWith(id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class ReplaceOnePresenter {
      fullName: string;

      static fromEntity(_: Entity) {
        return { fullName: _.name };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: ReplaceOnePresenter } });
    const id = 'fakeId';
    const body = {};

    await expect(controller.replaceOne(id, body)).resolves.toEqual({ fullName: 'test' });
    expect(service.replaceOne).toHaveBeenCalledTimes(1);
    expect(service.replaceOne).toHaveBeenCalledWith(id, body);
  });
});
