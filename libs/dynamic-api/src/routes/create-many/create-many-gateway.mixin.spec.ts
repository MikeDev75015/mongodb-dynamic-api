import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
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

  it('should return a class that extends BaseGateway and implements CreateManyGateway', () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(CreateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(CreateManyGateway.name).toBe('BaseCreateManyTestEntityGateway');
  });

  it('should have an createMany method that calls the service', async () => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    const body = {
      list: [{ field1: 'test' }],
    };

    await createManyGateway.createMany(socket, body);

    expect(service.createMany).toHaveBeenCalledWith([{ field1: 'test' }]);
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
