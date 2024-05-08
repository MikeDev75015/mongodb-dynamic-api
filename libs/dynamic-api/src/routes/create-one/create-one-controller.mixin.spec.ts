import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneController } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneService } from './create-one-service.interface';

class Entity extends BaseEntity {}

describe('CreateOneControllerMixin', () => {
  let controller: CreateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateOne' };
  const version = '1';

  const service = {
    createOne: jest.fn(),
  } as CreateOneService<Entity>;

  beforeEach(() => {
    class Controller extends CreateOneControllerMixin(
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

  it('should call service.createOne', async () => {
    const body = {};
    await controller.createOne(body);

    expect(service.createOne).toHaveBeenCalledWith(body);
  });
});
