import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateManyGatewayConstructor } from './create-many-gateway.interface';
import { CreateManyGatewayMixin } from './create-many-gateway.mixin';
import { CreateManyService } from './create-many-service.interface';

describe('CreateManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let CreateManyGateway: CreateManyGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<CreateManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'CreateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  const body = {
    list: [{ field1: 'test' }],
  };

  it('should return a class that extends BaseGateway and implements CreateManyGateway', () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(CreateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(CreateManyGateway.name).toBe('BaseCreateManyTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    service.createMany.mockResolvedValueOnce([fakeEntity]);

    await expect(createManyGateway.createMany(socket, body)).resolves.toEqual({
      event: 'create-many-test-entity',
      data: [fakeEntity],
    });

    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });

  it('should use eventName from routeConfig if provided', async () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    service.createMany.mockResolvedValueOnce([]);

    await expect(createManyGateway.createMany(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: [],
    });
  });

  it('should use subPath in eventName if provided', async () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    service.createMany.mockResolvedValueOnce([]);

    await expect(createManyGateway.createMany(socket, body)).resolves.toEqual({
      event: 'create-many-sub-test-entity',
      data: [],
    });
  });

  test.each([
    ['body is empty', {} as any],
    ['list is not in the body', { field1: 'test' } as any],
    ['list is not an array', { list: '1' } as any],
    ['list is empty', { list: [] } as any],
  ])('should throw an exception if %s', async (_, body) => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    await expect(createManyGateway.createMany(socket, body)).rejects.toThrow();
  });
});
