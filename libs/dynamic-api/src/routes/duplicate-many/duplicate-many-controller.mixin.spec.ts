import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateManyController } from './duplicate-many-controller.interface';
import { DuplicateManyControllerMixin } from './duplicate-many-controller.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

class Entity extends BaseEntity {}

describe('DuplicateManyControllerMixin', () => {
  let controller: DuplicateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateMany' };
  const version = '1';

  const service = {
    duplicateMany: jest.fn(),
  } as DuplicateManyService<Entity>;

  beforeEach(() => {
    class Controller extends DuplicateManyControllerMixin(
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

  it('should call service.duplicateMany', async () => {
    const ids = [];
    const body = {};
    await controller.duplicateMany(ids, body);

    expect(service.duplicateMany).toHaveBeenCalledWith(ids, body);
  });
});
