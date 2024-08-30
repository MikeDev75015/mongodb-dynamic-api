import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { ReplaceOneGatewayConstructor } from './replace-one-gateway.interface';
import { ReplaceOneGatewayMixin } from './replace-one-gateway.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

describe('ReplaceOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let ReplaceOneGateway: ReplaceOneGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<ReplaceOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'ReplaceOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { id: '1', field1: 'test' } as TestEntity;
  const body = { id: '1', field1: 'value' };

  it('should return a class that extends BaseGateway and implements ReplaceOneGateway', () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(ReplaceOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(ReplaceOneGateway.name).toBe('BaseReplaceOneTestEntityGateway');
  });

  test.each([
    ['id is not in the body', {} as any],
    ['id is only field in the body', { id: '1' }],
  ])('should throw an exception if %s', async (_, body) => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    await expect(replaceOneGateway.replaceOne(socket, body)).rejects.toThrow();
  });

  it('should call the service and return event and data', async () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    service.replaceOne.mockResolvedValueOnce(fakeEntity);

    await expect(replaceOneGateway.replaceOne(socket, body)).resolves.toEqual({
      event: 'replace-one-test-entity',
      data: fakeEntity,
    });

    expect(service.replaceOne).toHaveBeenCalledWith(body.id, { field1: 'value' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    service.replaceOne.mockResolvedValueOnce(fakeEntity);

    await expect(replaceOneGateway.replaceOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeEntity,
    });
  });

  it('should use subPath in eventName if provided', async () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);

    service.replaceOne.mockResolvedValueOnce(fakeEntity);

    await expect(replaceOneGateway.replaceOne(socket, body)).resolves.toEqual({
      event: 'replace-one-sub-test-entity',
      data: fakeEntity,
    });
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class ReplaceOneData {
      fullName: string;

      static toEntity(_: ReplaceOneData) {
        return { field1: _.fullName };
      }
    }

    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: ReplaceOneData } },
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);
    service.replaceOne.mockResolvedValueOnce(fakeEntity);
    const body = { id: '1', fullName: 'test' };
    const expectedArg = { field1: 'test' };

    await expect(replaceOneGateway.replaceOne(socket, body)).resolves.toEqual({
      event: 'replace-one-test-entity',
      data: fakeEntity,
    });
    expect(service.replaceOne).toHaveBeenCalledTimes(1);
    expect(service.replaceOne).toHaveBeenCalledWith(body.id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class ReplaceOneResponse {
      ref: string;
      fullName: string;

      static fromEntity(_: TestEntity): ReplaceOneResponse {
        return { ref: _.id, fullName: _.field1 };
      }
    }

    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: ReplaceOneResponse } },
    );

    const replaceOneGateway = new ReplaceOneGateway(service, jwtService);
    service.replaceOne.mockResolvedValueOnce(fakeEntity);
    const presenter = { ref: '1', fullName: 'test' };

    await expect(replaceOneGateway.replaceOne(socket, body)).resolves.toEqual({
      event: 'replace-one-test-entity',
      data: presenter,
    });
    expect(service.replaceOne).toHaveBeenCalledTimes(1);
    expect(service.replaceOne).toHaveBeenCalledWith(body.id, { field1: body.field1 });
  });
});
