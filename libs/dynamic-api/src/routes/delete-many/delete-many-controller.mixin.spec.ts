import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
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

  const initController = (
    _entity: Type<Entity> = Entity,
    _controllerOptions: DynamicApiControllerOptions<Entity> = controllerOptions,
    _routeConfig: DynamicAPIRouteConfig<Entity> = routeConfig,
    _version: string = version,
  ) => {
    class Controller extends DeleteManyControllerMixin(
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
  }

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.deleteMany and return response', async () => {
    controller = initController();
    const query = { ids: [] };
    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(controller.deleteMany(query)).resolves.toEqual(fakeDeleteResult);
    expect(service.deleteMany).toHaveBeenCalledWith(query.ids);
  });

  it('should map response to presenter', async () => {
    class Presenter {
      isDeleted: boolean;

      static fromDeleteResult(deleteResult: DeleteResult) {
        return { isDeleted: deleteResult.deletedCount > 0 };
      }
    }

    controller = initController(
      undefined,
      undefined,
      { ...routeConfig, dTOs: { presenter: Presenter } },
    );

    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(controller.deleteMany({ ids: [] })).resolves.toEqual({ isDeleted: true });
  });
});
