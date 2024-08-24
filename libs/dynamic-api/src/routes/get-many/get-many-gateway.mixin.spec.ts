import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
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

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'GetMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = { field1: 'test' };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements GetManyGateway', () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(GetManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(GetManyGateway.name).toBe('BaseGetManyTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const getManyGateway = new GetManyGateway(service, jwtService);

    service.getMany.mockResolvedValueOnce([fakeEntity]);

    await expect(getManyGateway.getMany(socket, body)).resolves.toEqual({
      event: 'get-many-test-entity',
      data: [fakeEntity],
    });

    expect(service.getMany).toHaveBeenCalledWith({ field1: 'test' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event-name' },
    );

    const getManyGateway = new GetManyGateway(service, jwtService);

    service.getMany.mockResolvedValueOnce([fakeEntity]);

    await expect(getManyGateway.getMany(socket, body)).resolves.toEqual({
      event: 'custom-event-name',
      data: [fakeEntity],
    });
  });

  it('should use subPath in eventName if provided', async () => {
    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const getManyGateway = new GetManyGateway(service, jwtService);

    service.getMany.mockResolvedValueOnce([fakeEntity]);

    await expect(getManyGateway.getMany(socket, body)).resolves.toEqual({
      event: 'get-many-sub-test-entity',
      data: [fakeEntity],
    });
  });
});
