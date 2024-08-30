import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyController } from './update-many-controller.interface';
import { UpdateManyControllerMixin } from './update-many-controller.mixin';
import { UpdateManyService } from './update-many-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('UpdateManyControllerMixin', () => {
  let controller: UpdateManyController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateMany' };
  const version = '1';
  const service = createMock<UpdateManyService<Entity>>();
  const fakeEntities = [{ id: '1', name: 'test' }, { id: '2', name: 'unit' }] as Entity[];

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends UpdateManyControllerMixin(
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
    service.updateMany.mockResolvedValueOnce(fakeEntities);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should throw error if ids is invalid', async () => {
    controller = initController();
    const ids = [];

    await expect(controller.updateMany(ids, {})).rejects.toThrow(
      new Error('Invalid query'),
    );
    expect(service.updateMany).toHaveBeenCalledTimes(0);
  });

  it('should throw error if body is empty', async () => {
    controller = initController();
    const ids = ['fakeId'];
    const body = {};

    await expect(controller.updateMany(ids, body)).rejects.toThrow(
      new Error('Invalid request body'),
    );
    expect(service.updateMany).toHaveBeenCalledTimes(0);
  });

  it('should call service.updateMany and return response', async () => {
    controller = initController();
    const ids = ['fakeId'];
    const body = { name: 'test' };

    await expect(controller.updateMany(ids, body)).resolves.toEqual(fakeEntities);
    expect(service.updateMany).toHaveBeenCalledTimes(1);
    expect(service.updateMany).toHaveBeenCalledWith(ids, body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class UpdateManyBody {
      fullName: string;

      static toEntity(body: UpdateManyBody) {
        return { name: body.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: UpdateManyBody } });
    const ids = ['1'];
    const body = { fullName: 'test' };

    await expect(controller.updateMany(ids, body)).resolves.toEqual(fakeEntities);
    expect(service.updateMany).toHaveBeenCalledTimes(1);
    expect(service.updateMany).toHaveBeenCalledWith(ids, { name: 'test' });
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class UpdateManyPresenter {
      fullName: string;

      static fromEntities(entities: Entity[]) {
        return entities.map((entity) => ({ fullName: entity.name }));
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: UpdateManyPresenter } });
    const ids = ['1'];
    const body = { fullName: 'test' };
    const expectedResponse = [{ fullName: 'test' }, { fullName: 'unit' }];

    await expect(controller.updateMany(ids, body)).resolves.toEqual(expectedResponse);
    expect(service.updateMany).toHaveBeenCalledTimes(1);
    expect(service.updateMany).toHaveBeenCalledWith(ids, body);
  });
});
