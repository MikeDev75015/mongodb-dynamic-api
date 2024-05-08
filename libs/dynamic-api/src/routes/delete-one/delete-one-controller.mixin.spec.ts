import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
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

  const service = {
    deleteOne: jest.fn(),
  } as DeleteOneService<Entity>;

  beforeEach(() => {
    class Controller extends DeleteOneControllerMixin(
      Entity,
      controllerOptions,
      routeConfig,
      version,
    ) {
      constructor() {
        super(service);
      }
    }

    controller = new Controller();
  });

  it('should create controller', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.deleteOne', async () => {
    const query = 'fake-id';
    await controller.deleteOne(query);

    expect(service.deleteOne).toHaveBeenCalledWith(query);
  });
});
