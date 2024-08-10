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

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DeleteOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements DeleteOneGateway', () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DeleteOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DeleteOneGateway.name).toBe('BaseDeleteOneTestEntityGateway');
  });

  it('should have an deleteOne method that calls the service', async () => {
    DeleteOneGateway = DeleteOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const deleteOneGateway = new DeleteOneGateway(service, jwtService);

    const body = {
      id: '1',
    };

    await deleteOneGateway.deleteOne(socket, body);

    expect(service.deleteOne).toHaveBeenCalledWith('1');
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
