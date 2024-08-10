import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyGatewayConstructor } from './update-many-gateway.interface';
import { UpdateManyGatewayMixin } from './update-many-gateway.mixin';
import { UpdateManyService } from './update-many-service.interface';

describe('UpdateManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let UpdateManyGateway: UpdateManyGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<UpdateManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'UpdateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements UpdateManyGateway', () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(UpdateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(UpdateManyGateway.name).toBe('BaseUpdateManyTestEntityGateway');
  });

  it('should have an updateMany method that calls the service', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    const body = {
      ids: ['1', '2', '3'],
      field1: 'test',
    };

    await updateManyGateway.updateMany(socket, body);

    expect(service.updateMany).toHaveBeenCalledWith(['1', '2', '3'], { field1: 'test' });
  });

  test.each([
    ['no entity field is in body', { ids: ['1', '2', '3'] }],
    ['ids is not in the body', { field1: 'test' } as any],
    ['ids is not an array', { ids: '1', field1: 'test' } as any],
  ])('should throw an exception if %s', async (_, body) => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    await expect(updateManyGateway.updateMany(socket, body)).rejects.toThrow(new WsException('Invalid request body'));
  });
});
