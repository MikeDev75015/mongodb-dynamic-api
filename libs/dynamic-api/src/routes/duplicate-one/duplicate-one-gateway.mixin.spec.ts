import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
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

  it('should return a class that extends BaseGateway and implements DuplicateOneGateway', () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateOneGateway.name).toBe('BaseDuplicateOneTestEntityGateway');
  });

  it('should have an duplicateOne method that calls the service', async () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    const body = { id: '1' };

    await duplicateOneGateway.duplicateOne(socket, body);

    expect(service.duplicateOne).toHaveBeenCalledWith('1', {});
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
