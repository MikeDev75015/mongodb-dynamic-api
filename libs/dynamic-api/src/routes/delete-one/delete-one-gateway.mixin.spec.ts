import { describe, expect, it, test } from 'vitest';
import { createMock } from '@test-helpers';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DeleteResult, DynamicApiControllerOptions, DynamicApiRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneGatewayConstructor } from './delete-one-gateway.interface';
import { DeleteOneGatewayMixin } from './delete-one-gateway.mixin';
import { DeleteOneService } from './delete-one-service.interface';
import { EntityParam } from '../../dtos/entity.param';

describe('DeleteOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DeleteOneGateway: DeleteOneGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<DeleteOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteOne',
  } as DynamicApiRouteConfig<TestEntity>;

  const fakeDeleteResult = { deletedCount: 1 };
  const body = { id: '1' };


  it('should return a class that extends BaseGateway and implements DeleteOneGateway', () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DeleteOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DeleteOneGateway.name).toBe('BaseDeleteOneTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteOneGateway.deleteOne(socket, body)).resolves.toEqual({
      event: 'delete-one-test-entity',
      data: fakeDeleteResult,
    });

    expect(service.deleteOne).toHaveBeenCalledWith('1', undefined);
  });

  it('should pass user from socket to service.deleteOne', async () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    const socketWithUser = { user: fakeUser } as unknown as ExtendedSocket<TestEntity>;

    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteOneGateway.deleteOne(socketWithUser, body)).resolves.toEqual({
      event: 'delete-one-test-entity',
      data: fakeDeleteResult,
    });

    expect(service.deleteOne).toHaveBeenCalledWith('1', fakeUser);
  });

  it('should use eventName from routeConfig if provided', async () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteOneGateway.deleteOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeDeleteResult,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    service.deleteOne.mockResolvedValueOnce(fakeDeleteResult);

    await expect(deleteOneGateway.deleteOne(socket, body)).resolves.toEqual({
      event: 'delete-one-sub-test-entity',
      data: fakeDeleteResult,
    });
  });

  it('should map response to presenter', async () => {
    class Presenter {
      isDeleted: boolean;

      static fromDeleteResult(deleteResult: DeleteResult) {
        return { isDeleted: deleteResult.deletedCount > 0 };
      }
    }

    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: Presenter } },
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    service.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    await expect(deleteOneGateway.deleteOne(socket, body)).resolves.toEqual(
      {
        event: 'delete-one-test-entity',
        data: { isDeleted: false },
      },
    );
  });

  test.each([
    ['id is not in the body', {} as unknown as EntityParam],
  ])('should throw an exception if %s', async (_, body) => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    await expect(deleteOneGateway.deleteOne(socket, body)).rejects.toThrow();
  });
});
