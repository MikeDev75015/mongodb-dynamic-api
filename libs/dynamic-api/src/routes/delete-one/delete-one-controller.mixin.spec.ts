import { createMock } from '@golevelup/ts-jest';
import { DeleteResult, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneController } from './delete-one-controller.interface';
import { DeleteOneControllerMixin } from './delete-one-controller.mixin';
import { DeleteOneService } from './delete-one-service.interface';

class Entity extends BaseEntity {}

describe('DeleteOneControllerMixin', () => {
  let controller: DeleteOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteOne' };
  const version = '1';
  const service = createMock<DeleteOneService<Entity>>();
  const fakeDeleteResult = { deletedCount: 1 } as DeleteResult;

  const initController = (_routeConfig: DynamicAPIRouteConfig<Entity> = routeConfig) => {
    class Controller extends DeleteOneControllerMixin(
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
    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.deleteOne and return response', async () => {
    controller = initController();
    const query = 'fake-id';

    await expect(controller.deleteOne(query)).resolves.toEqual(fakeDeleteResult);
    expect(service.deleteOne).toHaveBeenCalledTimes(1);
    expect(service.deleteOne).toHaveBeenCalledWith(query);
  });

  it('should map response to presenter', async () => {
    class Presenter {
      isDeleted: boolean;

      static fromDeleteResult(deleteResult: DeleteResult) {
        return { isDeleted: deleteResult.deletedCount > 0 };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: Presenter } });
    const query = 'fake-id';

    await expect(controller.deleteOne(query)).resolves.toEqual({ isDeleted: true });
    expect(service.deleteOne).toHaveBeenCalledTimes(1);
    expect(service.deleteOne).toHaveBeenCalledWith(query);
  });
});
