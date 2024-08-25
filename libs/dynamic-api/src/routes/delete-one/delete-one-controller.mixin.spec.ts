import { createMock } from '@golevelup/ts-jest';
import { Type } from '@nestjs/common';
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

  const fakeDeleteResult = { deletedCount: 1 };

  const service = createMock<DeleteOneService<Entity>>();

  const initController = (
    _entity: Type<Entity> = Entity,
    _controllerOptions: DynamicApiControllerOptions<Entity> = controllerOptions,
    _routeConfig: DynamicAPIRouteConfig<Entity> = routeConfig,
    _version: string = version,
  ) => {
    class Controller extends DeleteOneControllerMixin(
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
    expect(initController()).toBeDefined();
  });

  it('should call service.deleteOne and return response', async () => {
    controller = initController();
    const query = 'fake-id';
    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

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

    controller = initController(
      undefined,
      undefined,
      { ...routeConfig, dTOs: { presenter: Presenter } },
    );

    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

    await expect(controller.deleteOne('fake-id')).resolves.toEqual({ isDeleted: true });
  });
});
