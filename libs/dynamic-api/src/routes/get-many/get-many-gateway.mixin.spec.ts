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
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<GetManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'GetMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { field1: 'test' } as TestEntity;
  const body = { field1: 'unit' };

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
    expect(service.getMany).toHaveBeenCalledTimes(1);
    expect(service.getMany).toHaveBeenCalledWith(body);
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

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class GetManyPresenter {
      fullName: string;

      static fromEntities(_: TestEntity[]) {
        return _.map(({ field1 }) => ({ fullName: field1 }));
      }
    }

    GetManyGateway = GetManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: GetManyPresenter } },
    );

    const getManyGateway = new GetManyGateway(service, jwtService);

    service.getMany.mockResolvedValueOnce([fakeEntity]);

    await expect(getManyGateway.getMany(socket, body)).resolves.toEqual({
      event: 'get-many-test-entity',
      data: [{ fullName: 'test' }],
    });
  });
});
