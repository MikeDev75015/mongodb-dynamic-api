import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneController } from './replace-one-controller.interface';
import { ReplaceOneControllerMixin } from './replace-one-controller.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

class Entity extends BaseEntity {}

describe('ReplaceOneControllerMixin', () => {
  let controller: ReplaceOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'ReplaceOne' };
  const version = '1';

  const service = {
    replaceOne: jest.fn(),
  } as ReplaceOneService<Entity>;

  beforeEach(() => {
    class Controller extends ReplaceOneControllerMixin(
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

  it('should call service.replaceOne', async () => {
    const id = 'fakeId';
    const body = {};
    await controller.replaceOne(id, body);

    expect(service.replaceOne).toHaveBeenCalledWith(id, body);
  });
});
