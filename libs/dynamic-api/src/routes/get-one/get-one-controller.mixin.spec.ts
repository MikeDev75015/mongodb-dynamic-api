import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetOneController } from './get-one-controller.interface';
import { GetOneControllerMixin } from './get-one-controller.mixin';
import { GetOneService } from './get-one-service.interface';

class Entity extends BaseEntity {}

describe('GetOneControllerMixin', () => {
  let controller: GetOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetOne' };
  const version = '1';

  const service = {
    getOne: jest.fn(),
  } as GetOneService<Entity>;

  beforeEach(() => {
    class Controller extends GetOneControllerMixin(
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

  it('should call service.getOne', async () => {
    const id = 'fakeId';
    await controller.getOne(id);

    expect(service.getOne).toHaveBeenCalledWith(id);
  });
});
