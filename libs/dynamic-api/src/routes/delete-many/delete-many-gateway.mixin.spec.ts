import { describe, expect, it, test } from 'vitest';
import { createMock } from '@test-helpers';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DeleteResult, DynamicApiControllerOptions, DynamicApiRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyGatewayConstructor } from './delete-many-gateway.interface';
import { DeleteManyGatewayMixin } from './delete-many-gateway.mixin';
import { DeleteManyService } from './delete-many-service.interface';
import { ManyEntityQuery } from '../../dtos/many-entity.query';

describe('DeleteManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DeleteManyGateway: DeleteManyGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<DeleteManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteMany',
  } as DynamicApiRouteConfig<TestEntity>;

  const fakeDeleteResult = { deletedCount: 3 } as DeleteResult;
  const body = { ids: ['1', '2', '3'] };

  it('should return a class that extends BaseGateway and implements DeleteManyGateway', () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DeleteManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DeleteManyGateway.name).toBe('BaseDeleteManyTestEntityGateway');
  });

  test.each([
    ['ids is not in the body', {} as unknown as ManyEntityQuery],
    ['ids is not an array', { ids: '1' } as unknown as ManyEntityQuery],
    ['ids is empty', { ids: [] } as unknown as ManyEntityQuery],
  ])('should throw an exception if %s', async (_, body) => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    await expect(deleteManyGateway.deleteMany(socket, body)).rejects.toThrow();
  });

  it('should call the service and return event and data', async () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteManyGateway.deleteMany(socket, body)).resolves.toEqual({
      event: 'delete-many-test-entity',
      data: fakeDeleteResult,
    });

    expect(service.deleteMany).toHaveBeenCalledWith(body.ids, undefined);
  });

  it('should pass user from socket to service.deleteMany', async () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    const socketWithUser = { user: fakeUser } as unknown as ExtendedSocket<TestEntity>;

    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteManyGateway.deleteMany(socketWithUser, body)).resolves.toEqual({
      event: 'delete-many-test-entity',
      data: fakeDeleteResult,
    });

    expect(service.deleteMany).toHaveBeenCalledWith(body.ids, fakeUser);
  });

  it('should use eventName from routeConfig if provided', async () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteManyGateway.deleteMany(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeDeleteResult,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    service.deleteMany.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteManyGateway.deleteMany(socket, body)).resolves.toEqual({
      event: 'delete-many-sub-test-entity',
      data: fakeDeleteResult,
    });
  });

  it('should map response to presenter', async () => {
    class Presenter {
      isDeleted: boolean;

      static fromDeleteResult(_: DeleteResult) {
        return { isDeleted: _.deletedCount > 0 };
      }
    }

    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: Presenter } },
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    service.deleteMany.mockResolvedValueOnce({ deletedCount: 0 });

    await expect(deleteManyGateway.deleteMany(socket, { ids: ['1'] })).resolves.toEqual({
      event: 'delete-many-test-entity',
      data: { isDeleted: false },
    });
    expect(service.deleteMany).toHaveBeenCalledTimes(1);
    expect(service.deleteMany).toHaveBeenCalledWith(['1'], undefined);
  });
});
