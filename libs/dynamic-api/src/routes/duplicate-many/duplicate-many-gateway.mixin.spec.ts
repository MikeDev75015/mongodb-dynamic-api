import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DuplicateManyGatewayConstructor } from './duplicate-many-gateway.interface';
import { DuplicateManyGatewayMixin } from './duplicate-many-gateway.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

describe('DuplicateManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let DuplicateManyGateway: DuplicateManyGatewayConstructor<TestEntity>;
  let socket: ExtendedSocket<TestEntity>;

  const service = createMock<DuplicateManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DuplicateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const body = {
    ids: ['1', '2', '3'],
    field1: 'test',
  };

  const fakeEntity = plainToInstance(TestEntity, { field1: 'test' });

  it('should return a class that extends BaseGateway and implements DuplicateManyGateway', () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateManyGateway.name).toBe('BaseDuplicateManyTestEntityGateway');
  });

  it('should call the service and return event and data', async () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    service.duplicateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'test-duplicate-many',
      data: [fakeEntity],
    });

    expect(service.duplicateMany).toHaveBeenCalledWith(body.ids, { field1: 'test' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event-name' },
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    service.duplicateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'custom-event-name',
      data: [fakeEntity],
    });
  });

  test.each([
    ['ids is not in the body', { field1: 'test' } as any],
    ['ids is not an array', { ids: '1', field1: 'test' } as any],
  ])('should throw an exception if %s', async (_, body) => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).rejects.toThrow();
  });
});
