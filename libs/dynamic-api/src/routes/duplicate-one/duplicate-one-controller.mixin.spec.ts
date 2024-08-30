import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneController } from './duplicate-one-controller.interface';
import { DuplicateOneControllerMixin } from './duplicate-one-controller.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('DuplicateOneControllerMixin', () => {
  let controller: DuplicateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'DuplicateOne' };
  const version = '1';
  const service = createMock<DuplicateOneService<Entity>>();
  const fakeEntity = { id: '1', name: 'test' } as Entity;

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends DuplicateOneControllerMixin(
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
    service.duplicateOne.mockResolvedValueOnce(fakeEntity);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should call service.duplicateOne and return response', async () => {
    controller = initController();
    const id = 'fakeId';
    const body = { name: 'test' };

    await expect(controller.duplicateOne(id, body)).resolves.toEqual(fakeEntity);
    expect(service.duplicateOne).toHaveBeenCalledTimes(1);
    expect(service.duplicateOne).toHaveBeenCalledWith(id, body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class DuplicateOneBody {
      fullName: string;

      static toEntity(_: DuplicateOneBody) {
        return { name: _.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: DuplicateOneBody } });
    const id = 'fakeId';
    const body = { fullName: 'test' };
    const expectedArg = { name: 'test' };

    await controller.duplicateOne(id, body);
    expect(service.duplicateOne).toHaveBeenCalledTimes(1);
    expect(service.duplicateOne).toHaveBeenCalledWith(id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class DuplicateOnePresenter {
      fullName: string;

      static fromEntity(_: Entity) {
        return { fullName: _.name };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: DuplicateOnePresenter } });
    const id = 'fakeId';
    const body = { name: 'test' };

    await expect(controller.duplicateOne(id, body)).resolves.toEqual({ fullName: 'test' });
    expect(service.duplicateOne).toHaveBeenCalledTimes(1);
    expect(service.duplicateOne).toHaveBeenCalledWith(id, body);
  });
});
