import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteOneGatewayConstructor } from './delete-one-gateway.interface';
import { DeleteOneGatewayMixin } from './delete-one-gateway.mixin';
import { DeleteOneService } from './delete-one-service.interface';

describe('DeleteOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DeleteOneGateway: DeleteOneGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<DeleteOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    id: '1',
  };

  const fakeDeleteResult = { deletedCount: 1 };

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
      event: 'test-delete-one',
      data: fakeDeleteResult,
    });

    expect(service.deleteOne).toHaveBeenCalledWith('1');
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

  test.each([
    ['id is not in the body', {} as any],
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
