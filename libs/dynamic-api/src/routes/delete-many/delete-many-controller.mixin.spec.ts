import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
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

  const service = {
    deleteMany: jest.fn(),
  } as DeleteManyService<Entity>;

  beforeEach(() => {
    class Controller extends DeleteManyControllerMixin(
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
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.deleteMany', async () => {
    const query = { ids: [] };
    await controller.deleteMany(query);

    expect(service.deleteMany).toHaveBeenCalledWith(query.ids);
  });
});
