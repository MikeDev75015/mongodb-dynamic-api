import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
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

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'UpdateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    ids: ['1', '2', '3'],
    field1: 'test',
  };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements UpdateManyGateway', () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(UpdateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(UpdateManyGateway.name).toBe('BaseUpdateManyTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'test-update-many',
      data: [fakeEntity],
    });

    expect(service.updateMany).toHaveBeenCalledWith(body.ids, { field1: 'test' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: [fakeEntity],
    });
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
