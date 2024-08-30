import { createMock } from '@golevelup/ts-jest';
import { DeleteResult, DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyController } from './delete-many-controller.interface';
import { DeleteManyControllerMixin } from './delete-many-controller.mixin';
import { DeleteManyService } from './delete-many-service.interface';

class Entity extends BaseEntity {}

describe('DeleteManyControllerMixin', () => {
  let controller: DeleteManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DeleteMany' };
  const version = '1';
  const service = createMock<DeleteManyService<Entity>>();
  const fakeDeleteResult = { deletedCount: 3 };

  const initController = (_routeConfig: DynamicAPIRouteConfig<Entity> = routeConfig) => {
    class Controller extends DeleteManyControllerMixin(
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
  }

  beforeEach(() => {
    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should throw error if ids is invalid', async () => {
    controller = initController();
    const ids = [];

    await expect(controller.deleteMany({ ids })).rejects.toThrow(new Error('Invalid query'));
    expect(service.deleteMany).toHaveBeenCalledTimes(0);
  });

  it('should call service.deleteMany and return response', async () => {
    controller = initController();
    const query = { ids: ['1'] };

    await expect(controller.deleteMany(query)).resolves.toEqual(fakeDeleteResult);
    expect(service.deleteMany).toHaveBeenCalledTimes(1);
    expect(service.deleteMany).toHaveBeenCalledWith(query.ids);
  });

  it('should map response to presenter if presenter dto has fromDeleteResult method', async () => {
    class Presenter {
      isDeleted: boolean;

      static fromDeleteResult(deleteResult: DeleteResult) {
        return { isDeleted: deleteResult.deletedCount > 0 };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: Presenter } });
    const query = { ids: ['1'] };

    await expect(controller.deleteMany(query)).resolves.toEqual({ isDeleted: true });
    expect(service.deleteMany).toHaveBeenCalledTimes(1);
    expect(service.deleteMany).toHaveBeenCalledWith(query.ids);
  });
});
