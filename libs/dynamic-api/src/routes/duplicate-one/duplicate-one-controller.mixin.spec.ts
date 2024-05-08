import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneController } from './duplicate-one-controller.interface';
import { DuplicateOneControllerMixin } from './duplicate-one-controller.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

class Entity extends BaseEntity {}

describe('DuplicateOneControllerMixin', () => {
  let controller: DuplicateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateOne' };
  const version = '1';

  const service = {
    duplicateOne: jest.fn(),
  } as DuplicateOneService<Entity>;

  beforeEach(() => {
    class Controller extends DuplicateOneControllerMixin(
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

  it('should call service.duplicateOne', async () => {
    const id = 'fakeId';
    const body = {};
    await controller.duplicateOne(id, body);

    expect(service.duplicateOne).toHaveBeenCalledWith(id, body);
  });
});
