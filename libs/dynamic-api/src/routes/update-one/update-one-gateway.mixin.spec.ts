import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
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
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<UpdateOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'UpdateOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    id: '1',
    field1: 'value',
  };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements UpdateOneGateway', () => {
    UpdateOneGateway = UpdateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(UpdateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(UpdateOneGateway.name).toBe('BaseUpdateOneTestEntityGateway');
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
      event: 'test-update-one',
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
});
