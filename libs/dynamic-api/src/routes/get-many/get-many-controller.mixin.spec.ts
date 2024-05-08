import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyController } from './get-many-controller.interface';
import { GetManyControllerMixin } from './get-many-controller.mixin';
import { GetManyService } from './get-many-service.interface';

class Entity extends BaseEntity {}

describe('GetManyControllerMixin', () => {
  let controller: GetManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetMany' };
  const version = '1';

  const service = {
    getMany: jest.fn(),
  } as GetManyService<Entity>;

  beforeEach(() => {
    class Controller extends GetManyControllerMixin(
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

  it('should call service.getMany', async () => {
    await controller.getMany();

    expect(service.getMany).toHaveBeenCalledTimes(1);
  });

  it('should call service.getMany with query', async () => {
    const query = {};
    await controller.getMany(query);

    expect(service.getMany).toHaveBeenCalledWith(query);
  });
});
