import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneGatewayConstructor } from './replace-one-gateway.interface';
import { ReplaceOneGatewayMixin } from './replace-one-gateway.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

describe('ReplaceOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let ReplaceOneGateway: ReplaceOneGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<ReplaceOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'ReplaceOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements ReplaceOneGateway', () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(ReplaceOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(ReplaceOneGateway.name).toBe('BaseReplaceOneTestEntityGateway');
  });

  it('should have an replaceOne method that calls the service', async () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    const body = {
      id: '1',
      field1: 'value',
    };

    await replaceOneGateway.replaceOne(socket, body);

    expect(service.replaceOne).toHaveBeenCalledWith('1', { field1: 'value' });
  });

  test.each([
    ['id is not in the body', {} as any],
    ['id is only field in the body', { id: '1' }],
  ])('should throw an exception if %s', async (_, body) => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    await expect(replaceOneGateway.replaceOne(socket, body)).rejects.toThrow();
  });
});
