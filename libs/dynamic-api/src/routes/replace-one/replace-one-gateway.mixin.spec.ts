import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
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
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<ReplaceOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'ReplaceOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    id: '1',
    field1: 'value',
  };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements ReplaceOneGateway', () => {
    ReplaceOneGateway = ReplaceOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(ReplaceOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(ReplaceOneGateway.name).toBe('BaseReplaceOneTestEntityGateway');
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
});
