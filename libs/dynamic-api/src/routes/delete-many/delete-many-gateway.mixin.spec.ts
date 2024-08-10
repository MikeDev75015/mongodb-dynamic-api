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

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements DeleteManyGateway', () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DeleteManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DeleteManyGateway.name).toBe('BaseDeleteManyTestEntityGateway');
  });

  it('should have an deleteMany method that calls the service', async () => {
    DeleteManyGateway = DeleteManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteManyGateway = new DeleteManyGateway(service, jwtService);

    const body = {
      ids: ['1', '2', '3'],
    };

    await deleteManyGateway.deleteMany(socket, body);

    expect(service.deleteMany).toHaveBeenCalledWith(['1', '2', '3']);
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
