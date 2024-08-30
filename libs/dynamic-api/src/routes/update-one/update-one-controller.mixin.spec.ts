import { createMock } from '@golevelup/ts-jest';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateOneController } from './update-one-controller.interface';
import { UpdateOneControllerMixin } from './update-one-controller.mixin';
import { UpdateOneService } from './update-one-service.interface';

class Entity extends BaseEntity {
  name: string;
}

describe('UpdateOneControllerMixin', () => {
  let controller: UpdateOneController<Entity>;

  const controllerOptions: DynamicApiControllerOptions<Entity> = { path: 'test' };
  const routeConfig: DynamicAPIRouteConfig<Entity> = { type: 'UpdateOne' };
  const version = '1';
  const service = createMock<UpdateOneService<Entity>>();
  const fakeEntity = { id: '1', name: 'test' } as Entity;

  const initController = (_routeConfig = routeConfig) => {
    class Controller extends UpdateOneControllerMixin(
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
    service.updateOne.mockResolvedValueOnce(fakeEntity);
  });

  it('should create controller', () => {
    controller = initController();
    expect(controller).toBeDefined();
    expect(controller['entity']).toBe(Entity);
  });

  it('should throw error if body is empty', async () => {
    controller = initController();
    const id = 'fakeId';
    const body = {};

    await expect(controller.updateOne(id, body)).rejects.toThrow(
      new Error('Invalid request body'),
    );
    expect(service.updateOne).toHaveBeenCalledTimes(0);
  });

  it('should call service.updateOne and return response', async () => {
    controller = initController();
    const id = 'fakeId';
    const body = { age: 20 };

    await expect(controller.updateOne(id, body)).resolves.toEqual(fakeEntity);
    expect(service.updateOne).toHaveBeenCalledTimes(1);
    expect(service.updateOne).toHaveBeenCalledWith(id, body);
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class UpdateOneBody {
      fullName: string;

      static toEntity(_: UpdateOneBody) {
        return { name: _.fullName };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { body: UpdateOneBody } });
    const id = 'fakeId';
    const body = { fullName: 'test' };
    const expectedArg = { name: 'test' };

    await controller.updateOne(id, body);
    expect(service.updateOne).toHaveBeenCalledTimes(1);
    expect(service.updateOne).toHaveBeenCalledWith(id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class UpdateOnePresenter {
      fullName: string;

      static fromEntity(_: Entity) {
        return { fullName: _.name };
      }
    }

    controller = initController({ ...routeConfig, dTOs: { presenter: UpdateOnePresenter } });
    const id = 'fakeId';
    const body = { name: 'test' };
    const expectedResponse = { fullName: 'test' };

    await expect(controller.updateOne(id, body)).resolves.toEqual(expectedResponse);
    expect(service.updateOne).toHaveBeenCalledTimes(1);
    expect(service.updateOne).toHaveBeenCalledWith(id, body);
  });
});
