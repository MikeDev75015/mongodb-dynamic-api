import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { CreateOneGatewayConstructor } from './create-one-gateway.interface';
import { CreateOneGatewayMixin } from './create-one-gateway.mixin';
import { CreateOneService } from './create-one-service.interface';

describe('CreateOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let CreateOneGateway: CreateOneGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<CreateOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = { path: 'test' } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'CreateOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = { field1: 'test' };

  const fakeEntity = plainToInstance(TestEntity, { id: '1', field1: 'test' });

  it('should return a class that extends BaseGateway and implements CreateOneGateway', () => {
    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(CreateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(CreateOneGateway.name).toBe('BaseCreateOneTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);

    service.createOne.mockResolvedValueOnce(fakeEntity);

    await expect(createOneGateway.createOne(socket, body)).resolves.toEqual({
      event: 'create-one-test-entity',
      data: fakeEntity,
    });

    expect(service.createOne).toHaveBeenCalledWith({ field1: 'test' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);

    service.createOne.mockResolvedValueOnce(fakeEntity);

    await expect(createOneGateway.createOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeEntity,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);

    service.createOne.mockResolvedValueOnce(fakeEntity);

    await expect(createOneGateway.createOne(socket, body)).resolves.toEqual({
      event: 'create-one-sub-test-entity',
      data: fakeEntity,
    });
  });

  it('should throw an exception if body is empty', async () => {
    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);

    const body = {};

    await expect(createOneGateway.createOne(socket, body)).rejects.toThrow('Invalid request body');
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class CreateOneData {
      fullName: string;

      static toEntity(body: CreateOneData) {
        return { field1: body.fullName };
      }
    }

    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: CreateOneData } },
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);
    service.createOne.mockResolvedValueOnce(fakeEntity);
    const body = { fullName: 'test' };
    const expectedArg = { field1: 'test' };

    await expect(createOneGateway.createOne(socket, body)).resolves.toEqual({
      event: 'create-one-test-entity',
      data: fakeEntity,
    });
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class CreateOneResponse {
      ref: string;
      fullName: string;

      static fromEntity(entity: TestEntity): CreateOneResponse {
        return { ref: entity.id, fullName: entity.field1 };
      }
    }

    CreateOneGateway = CreateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: CreateOneResponse } },
    );

    const createOneGateway = new CreateOneGateway(service, jwtService);
    service.createOne.mockResolvedValueOnce(fakeEntity);
    const body = { field1: 'test' };
    const presenter = { ref: '1', fullName: 'test' };

    await expect(createOneGateway.createOne(socket, body)).resolves.toEqual({
      event: 'create-one-test-entity',
      data: presenter,
    });
    expect(service.createOne).toHaveBeenCalledTimes(1);
    expect(service.createOne).toHaveBeenCalledWith(body);
  });
});
