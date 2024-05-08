import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyController } from './update-many-controller.interface';
import { UpdateManyControllerMixin } from './update-many-controller.mixin';
import { UpdateManyService } from './update-many-service.interface';

class Entity extends BaseEntity {}

describe('UpdateManyControllerMixin', () => {
  let controller: UpdateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateMany' };
  const version = '1';

  const service = {
    updateMany: jest.fn(),
  } as UpdateManyService<Entity>;

  beforeEach(() => {
    class Controller extends UpdateManyControllerMixin(
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

  it('should call service.updateMany', async () => {
    const ids = ['fakeId'];
    const body = {};
    await controller.updateMany(ids, body);

    expect(service.updateMany).toHaveBeenCalledWith(ids, body);
  });
});
