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
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<DuplicateManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DuplicateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { field1: 'test' } as TestEntity;
  const body = {
    ids: ['1', '2', '3'],
    field1: 'test',
  };

  it('should return a class that extends BaseGateway and implements DuplicateManyGateway', () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateManyGateway.name).toBe('BaseDuplicateManyTestEntityGateway');
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

  it('should call the service and return event and data', async () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    service.duplicateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'duplicate-many-test-entity',
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

  it('should use subPath in eventName if provided', async () => {
    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    service.duplicateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'duplicate-many-sub-test-entity',
      data: [fakeEntity],
    });
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class DuplicateManyData {
      fullName: string;

      static toEntity(_: DuplicateManyData) {
        return { field1: _.fullName };
      }
    }

    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: DuplicateManyData } },
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    service.duplicateMany.mockResolvedValueOnce([fakeEntity]);

    const body = {
      ids: ['1', '2'],
      fullName: 'test',
    };

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'duplicate-many-test-entity',
      data: [fakeEntity],
    });
    expect(service.duplicateMany).toHaveBeenCalledTimes(1);
    expect(service.duplicateMany).toHaveBeenCalledWith(body.ids, { field1: body.fullName });
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class DuplicateManyResponse {
      id: string;
      fullName: string;

      static fromEntities(_: TestEntity[]) {
        return _.map((entity) => ({ id: entity.id, fullName: entity.field1 }));
      }
    }

    DuplicateManyGateway = DuplicateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: DuplicateManyResponse } },
    );

    const duplicateManyGateway = new DuplicateManyGateway(service, jwtService);

    const fakeServiceResponse = [{ id: '1', field1: 'test' }];
    service.duplicateMany.mockResolvedValueOnce(fakeServiceResponse);

    await expect(duplicateManyGateway.duplicateMany(socket, body)).resolves.toEqual({
      event: 'duplicate-many-test-entity',
      data: [{ id: '1', fullName: 'test' }],
    });
    expect(service.duplicateMany).toHaveBeenCalledTimes(1);
    expect(service.duplicateMany).toHaveBeenCalledWith(body.ids, { field1: 'test' });
  });
});
