import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateOneController } from './update-one-controller.interface';
import { UpdateOneControllerMixin } from './update-one-controller.mixin';
import { UpdateOneService } from './update-one-service.interface';

class Entity extends BaseEntity {}

describe('UpdateOneControllerMixin', () => {
  let controller: UpdateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateOne' };
  const version = '1';

  const service = {
    updateOne: jest.fn(),
  } as UpdateOneService<Entity>;

  beforeEach(() => {
    class Controller extends UpdateOneControllerMixin(
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

  it('should call service.updateOne', async () => {
    const id = 'fakeId';
    const body = {};
    await controller.updateOne(id, body);

    expect(service.updateOne).toHaveBeenCalledWith(id, body);
  });
});
