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
    ['list is invalid', { list: [{ name: 'test invalid' }, true] } as any],
  ])('should throw an exception if %s', async (_, body) => {
    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    await expect(createManyGateway.createMany(socket, body)).rejects.toThrow();
  });

  it('should map body to entities if body dto has toEntities method', async () => {
    class RouteBody {
      list: { field1: string }[];

      static toEntities(body: RouteBody): Partial<TestEntity>[] {
        return body.list.map((e, i) => ({ field1: `${i} - ${e.field1}` }));
      }
    }

    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: RouteBody } },
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    const fakeResponse = [{ id: '1', field1: 'test' }, { id: '2', field1: 'unit' }];

    service.createMany = jest.fn().mockResolvedValueOnce(fakeResponse);

    const body = { list: [{ field1: 'test' }, { field1: 'unit' }] };
    const expectedArg = [{ field1: '0 - test' }, { field1: '1 - unit' }];

    await expect(createManyGateway.createMany(socket, body)).resolves.toEqual({
      event: 'create-many-test-entity',
      data: fakeResponse,
    });
    expect(service.createMany).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class RoutePresenter {
      count: number;

      data: { ref: string; fullName: string }[];

      static fromEntities(entities: TestEntity[]): RoutePresenter {
        return {
          count: entities.length,
          data: entities.map(e => ({ ref: e.id, fullName: e.field1 })),
        };
      }
    }

    CreateManyGateway = CreateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: RoutePresenter } },
    );

    const createManyGateway = new CreateManyGateway(service, jwtService);

    const fakeResponse = [{ id: '1', field1: 'test' }, { id: '2', field1: 'unit' }] as TestEntity[];

    service.createMany.mockResolvedValueOnce(fakeResponse);

    const body = { list: [{ field1: 'test' }, { field1: 'unit' }] };
    const expectedResponse = {
      count: 2,
      data: [{ ref: '1', fullName: 'test' }, { ref: '2', fullName: 'unit' }],
    };

    await expect(createManyGateway.createMany(socket, body)).resolves.toEqual({
      event: 'create-many-test-entity',
      data: expectedResponse,
    });
    expect(service.createMany).toHaveBeenCalledWith(body.list);
  });
});
