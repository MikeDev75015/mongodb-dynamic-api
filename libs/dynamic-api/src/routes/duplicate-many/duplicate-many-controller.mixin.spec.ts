import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateManyController } from './duplicate-many-controller.interface';
import { DuplicateManyControllerMixin } from './duplicate-many-controller.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('DuplicateManyControllerMixin', () => {
  let controller: DuplicateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateMany' };
  const version = '1';
  const service = createMock<DuplicateManyService<Entity>>();
  const fakeEntities = [{ id: '1', name: 'test' }, { id: '2', name: 'test' }] as Entity[];

  const initController = (_routeConfig: DynamicAPIRouteConfig<Entity> = routeConfig) => {
    class Controller extends DuplicateManyControllerMixin(
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
    service.duplicateMany.mockResolvedValueOnce(fakeEntities);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should throw error if ids is invalid', async () => {
    controller = initController();
    const ids = [];

    await expect(controller.duplicateMany(ids, {})).rejects.toThrow(new Error('Invalid query'));
    expect(service.duplicateMany).toHaveBeenCalledTimes(0);
  });

  it('should call service.duplicateMany and return response', async () => {
    controller = initController();
    const ids = ['1'];
    const body = {};

    await expect(controller.duplicateMany(ids, body)).resolves.toEqual(fakeEntities);
    expect(service.duplicateMany).toHaveBeenCalledTimes(1);
    expect(service.duplicateMany).toHaveBeenCalledWith(ids, body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class DuplicateManyBody {
      fullName: string;

      static toEntity(body: DuplicateManyBody) {
        return { name: body.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: DuplicateManyBody } });
    const ids = ['1'];
    const body = { fullName: 'test' };

    await expect(controller.duplicateMany(ids, body)).resolves.toEqual(fakeEntities);
    expect(service.duplicateMany).toHaveBeenCalledTimes(1);
    expect(service.duplicateMany).toHaveBeenCalledWith(ids, { name: body.fullName });
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class DuplicateManyPresenter {
      id: string;

      fullName: string;

      static fromEntities(entities: Entity[]) {
        return entities.map((e) => (
          { id: e.id, fullName: e.name }
        ));
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: DuplicateManyPresenter } });
    const ids = ['1'];
    const body = { name: 'test' };

    await expect(controller.duplicateMany(ids, body))
    .resolves
    .toEqual([{ id: '1', fullName: 'test' }, { id: '2', fullName: 'test' }]);
    expect(service.duplicateMany).toHaveBeenCalledTimes(1);
    expect(service.duplicateMany).toHaveBeenCalledWith(ids, body);
  });
});
