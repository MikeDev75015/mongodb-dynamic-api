import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyGatewayConstructor } from './delete-many-gateway.interface';
import { DeleteManyGatewayMixin } from './delete-many-gateway.mixin';
import { DeleteManyService } from './delete-many-service.interface';

describe('DeleteManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DeleteManyGateway: DeleteManyGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<DeleteManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    ids: ['1', '2', '3'],
  };

  const fakeDeleteResult = { deletedCount: 3 };

  it('should return a class that extends BaseGateway and implements DeleteManyGateway', () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DeleteManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DeleteManyGateway.name).toBe('BaseDeleteManyTestEntityGateway');
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
      event: 'test-delete-many',
      data: fakeDeleteResult,
    });

    expect(service.deleteMany).toHaveBeenCalledWith(body.ids);
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

  test.each([
    ['ids is not in the body', {} as any],
    ['ids is not an array', { ids: '1' } as any],
    ['ids is empty', { ids: [] } as any],
  ])('should throw an exception if %s', async (_, body) => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    await expect(deleteManyGateway.deleteMany(socket, body)).rejects.toThrow();
  });
});
