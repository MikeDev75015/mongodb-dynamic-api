import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyController } from './get-many-controller.interface';
import { GetManyControllerMixin } from './get-many-controller.mixin';
import { GetManyService } from './get-many-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('GetManyControllerMixin', () => {
  let controller: GetManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'GetMany' };
  const version = '1';
  const service = createMock<GetManyService<Entity>>();
  const fakeEntities = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }] as Entity[];

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends GetManyControllerMixin(
      Entity,
      controllerOptions,
      _routeConfig,
      version,
    ) {
      constructor() {
        super(service);
      }
    }

    return new Controller();
  };

  beforeEach(() => {
    service.getMany.mockResolvedValueOnce(fakeEntities);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.getMany and return response', async () => {
    controller = initController();

    await expect(controller.getMany()).resolves.toEqual(fakeEntities);
    expect(service.getMany).toHaveBeenCalledTimes(1);
    expect(service.getMany).toHaveBeenCalledWith({});
  });

  it('should call service.getMany with query and return response', async () => {
    const query = { name: 'unit' };

    await expect(controller.getMany(query)).resolves.toEqual(fakeEntities);
    expect(service.getMany).toHaveBeenCalledTimes(1);
    expect(service.getMany).toHaveBeenCalledWith(query);
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class GetManyPresenter {
      fullName: string;

      static fromEntities(_: Entity[]) {
        return _.map(({ name }) => ({ fullName: name }));
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: GetManyPresenter } });
    const presenter = [{ fullName: 'test' }, { fullName: 'unit' }];

    await expect(controller.getMany()).resolves.toEqual(presenter);
    expect(service.getMany).toHaveBeenCalledTimes(1);
    expect(service.getMany).toHaveBeenCalledWith({});
  });
});
