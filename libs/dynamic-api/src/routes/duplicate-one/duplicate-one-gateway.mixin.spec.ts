import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateOneGatewayConstructor } from './duplicate-one-gateway.interface';
import { DuplicateOneGatewayMixin } from './duplicate-one-gateway.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

describe('DuplicateOneGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DuplicateOneGateway: DuplicateOneGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<DuplicateOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = { path: 'test' } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DuplicateOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = { id: '1' };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements DuplicateOneGateway', () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateOneGateway.name).toBe('BaseDuplicateOneTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    service.duplicateOne.mockResolvedValueOnce(fakeEntity);

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'test-duplicate-one',
      data: fakeEntity,
    });

    expect(service.duplicateOne).toHaveBeenCalledWith(body.id, {});
  });

  it('should use eventName from routeConfig if provided', async () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    service.duplicateOne.mockResolvedValueOnce(fakeEntity);

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: fakeEntity,
    });
  });

  test.each([
    ['id is not in the body', {} as any],
  ])('should throw an exception if %s', async (_, body) => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    await expect(duplicateOneGateway.duplicateOne(socket, body)).rejects.toThrow();
  });
});
