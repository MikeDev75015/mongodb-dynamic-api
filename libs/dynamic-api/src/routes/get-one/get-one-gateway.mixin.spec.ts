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
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<GetOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'GetOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { field1: 'test' } as TestEntity;
  const body = { id: '1' };

  it('should return a class that extends BaseGateway and implements GetOneGateway', () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(GetOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(GetOneGateway.name).toBe('BaseGetOneTestEntityGateway');
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

  it('should call the service and return event and data', async () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const getOneGateway = new GetOneGateway(service, jwtService);

    service.getOne.mockResolvedValueOnce(fakeEntity);

    await expect(getOneGateway.getOne(socket, body)).resolves.toEqual({
      event: 'get-one-test-entity',
      data: fakeEntity,
    });

    expect(service.getOne).toHaveBeenCalledWith(body.id);
  });

  it('should use eventName from routeConfig if provided', async () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const getOneGateway = new GetOneGateway(service, jwtService);

    service.getOne.mockResolvedValueOnce(fakeEntity);

    await expect(getOneGateway.getOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeEntity,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const getOneGateway = new GetOneGateway(service, jwtService);

    service.getOne.mockResolvedValueOnce(fakeEntity);

    await expect(getOneGateway.getOne(socket, body)).resolves.toEqual({
      event: 'get-one-sub-test-entity',
      data: fakeEntity,
    });
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class GetOneResponse {
      fullName: string;

      static fromEntity(_: TestEntity): GetOneResponse {
        return { fullName: _.field1 };
      }
    }

    GetOneGateway = GetOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: GetOneResponse } },
    );

    const createOneGateway = new GetOneGateway(service, jwtService);
    service.getOne.mockResolvedValueOnce(fakeEntity);
    const body = { id: '1' };
    const presenter = { fullName: 'test' };

    await expect(createOneGateway.getOne(socket, body)).resolves.toEqual({
      event: 'get-one-test-entity',
      data: presenter,
    });
    expect(service.getOne).toHaveBeenCalledTimes(1);
    expect(service.getOne).toHaveBeenCalledWith(body.id);
  });
});
