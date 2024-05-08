import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyController } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyService } from './create-many-service.interface';

class Entity extends BaseEntity {}

describe('CreateManyControllerMixin', () => {
  let controller: CreateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'CreateMany' };
  const version = '1';

  const service = {
    createMany: jest.fn(),
  } as CreateManyService<Entity>;

  beforeEach(() => {
    class Controller extends CreateManyControllerMixin(
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

  it('should call service.createMany', async () => {
    const body = { list: [{}] };
    await controller.createMany(body);

    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });
});
