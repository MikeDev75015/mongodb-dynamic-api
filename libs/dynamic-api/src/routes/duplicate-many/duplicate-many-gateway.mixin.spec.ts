import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
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

  const controllerOptions = {} as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DuplicateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  it('should return a class that extends BaseGateway and implements DuplicateManyGateway', () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateManyGateway.name).toBe('BaseDuplicateManyTestEntityGateway');
  });

  it('should have an duplicateMany method that calls the service', async () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    const body = {
      ids: ['1', '2', '3'],
      field1: 'test',
    };

    await duplicateManyGateway.duplicateMany(socket, body);

    expect(service.duplicateMany).toHaveBeenCalledWith(['1', '2', '3'], { field1: 'test' });
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
