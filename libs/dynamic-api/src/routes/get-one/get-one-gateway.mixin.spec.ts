import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { GetOneGatewayConstructor } from './get-one-gateway.interface';
import { GetOneGatewayMixin } from './get-one-gateway.mixin';
import { GetOneService } from './get-one-service.interface';

describe('GetOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let GetOneGateway: GetOneGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<GetOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'GetOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements GetOneGateway', () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(GetOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(GetOneGateway.name).toBe('BaseGetOneTestEntityGateway');
  });

  it('should have an getOne method that calls the service', async () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const getOneGateway = new GetOneGateway(service, jwtService);

    const body = {
      id: '1',
    };

    await getOneGateway.getOne(socket, body);

    expect(service.getOne).toHaveBeenCalledWith('1');
  });

  test.each([
    ['id is not in the body', {} as any],
  ])('should throw an exception if %s', async (_, body) => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const getOneGateway = new GetOneGateway(service, jwtService);

    await expect(getOneGateway.getOne(socket, body)).rejects.toThrow();
  });
});
