import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetManyGatewayConstructor } from './get-many-gateway.interface';
import { GetManyGatewayMixin } from './get-many-gateway.mixin';
import { GetManyService } from './get-many-service.interface';

describe('GetManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let GetManyGateway: GetManyGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<GetManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'GetMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements GetManyGateway', () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(GetManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(GetManyGateway.name).toBe('BaseGetManyTestEntityGateway');
  });

  it('should have an getMany method that calls the service', async () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const getManyGateway = new GetManyGateway(service, jwtService);

    const body = { field1: 'test' };

    await getManyGateway.getMany(socket, body);

    expect(service.getMany).toHaveBeenCalledWith({ field1: 'test' });
  });
});
