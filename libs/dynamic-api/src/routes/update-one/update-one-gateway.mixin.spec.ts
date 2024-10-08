import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateOneGatewayConstructor } from './update-one-gateway.interface';
import { UpdateOneGatewayMixin } from './update-one-gateway.mixin';
import { UpdateOneService } from './update-one-service.interface';

describe('UpdateOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let UpdateOneGateway: UpdateOneGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<UpdateOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'UpdateOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { id: '1', field1: 'test' } as TestEntity;
  const body = { id: '1', field1: 'value' };

  it('should return a class that extends BaseGateway and implements UpdateOneGateway', () => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(UpdateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(UpdateOneGateway.name).toBe('BaseUpdateOneTestEntityGateway');
  });

  test.each([
    ['id is not in the body', {} as any],
    ['id is the only field in the body', { id: '1' }],
  ])('should throw an exception if %s', async (_, body) => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);

    await expect(updateOneGateway.updateOne(socket, body)).rejects.toThrow();
  });

  it('should call the service and return event and data', async () => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);

    service.updateOne.mockResolvedValueOnce(fakeEntity);

    await expect(updateOneGateway.updateOne(socket, body)).resolves.toEqual({
      event: 'update-one-test-entity',
      data: fakeEntity,
    });

    expect(service.updateOne).toHaveBeenCalledWith(body.id, { field1: 'value' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);

    service.updateOne.mockResolvedValueOnce(fakeEntity);

    await expect(updateOneGateway.updateOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeEntity,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);

    service.updateOne.mockResolvedValueOnce(fakeEntity);

    await expect(updateOneGateway.updateOne(socket, body)).resolves.toEqual({
      event: 'update-one-sub-test-entity',
      data: fakeEntity,
    });
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class UpdateOneData {
      fullName: string;

      static toEntity(_: UpdateOneData) {
        return { field1: _.fullName };
      }
    }

    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: UpdateOneData } },
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);
    service.updateOne.mockResolvedValueOnce(fakeEntity);
    const body = { id: '1', fullName: 'test' };
    const expectedArg = { field1: 'test' };

    await expect(updateOneGateway.updateOne(socket, body)).resolves.toEqual({
      event: 'update-one-test-entity',
      data: fakeEntity,
    });
    expect(service.updateOne).toHaveBeenCalledTimes(1);
    expect(service.updateOne).toHaveBeenCalledWith(body.id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class UpdateOneResponse {
      ref: string;
      fullName: string;

      static fromEntity(_: TestEntity): UpdateOneResponse {
        return { ref: _.id, fullName: _.field1 };
      }
    }

    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: UpdateOneResponse } },
    );

    const updateOneGateway = new UpdateOneGateway(service, jwtService);
    service.updateOne.mockResolvedValueOnce(fakeEntity);
    const presenter = { ref: '1', fullName: 'test' };

    await expect(updateOneGateway.updateOne(socket, body)).resolves.toEqual({
      event: 'update-one-test-entity',
      data: presenter,
    });
    expect(service.updateOne).toHaveBeenCalledTimes(1);
    expect(service.updateOne).toHaveBeenCalledWith(body.id, { field1: body.field1 });
  });
});
