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
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<DuplicateOneService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = { path: 'test' } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'DuplicateOne',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { id: '1', field1: 'test' } as TestEntity;
  const body = { id: '1' };

  it('should return a class that extends BaseGateway and implements DuplicateOneGateway', () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(DuplicateOneGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(DuplicateOneGateway.name).toBe('BaseDuplicateOneTestEntityGateway');
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

  it('should call the service and return event and data', async () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    service.duplicateOne.mockResolvedValueOnce(fakeEntity);

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'duplicate-one-test-entity',
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

  it('should use subPath in eventName if provided', async () => {
    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);

    service.duplicateOne.mockResolvedValueOnce(fakeEntity);

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'duplicate-one-sub-test-entity',
      data: fakeEntity,
    });
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class DuplicateOneData {
      fullName: string;

      static toEntity(_: DuplicateOneData) {
        return { field1: _.fullName };
      }
    }

    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: DuplicateOneData } },
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);
    service.duplicateOne.mockResolvedValueOnce(fakeEntity);
    const body = { id: '1', fullName: 'test' };
    const expectedArg = { field1: 'test' };

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'duplicate-one-test-entity',
      data: fakeEntity,
    });
    expect(service.duplicateOne).toHaveBeenCalledTimes(1);
    expect(service.duplicateOne).toHaveBeenCalledWith(body.id, expectedArg);
  });

  it('should map entity to response if presenter dto has fromEntity method', async () => {
    class DuplicateOneResponse {
      ref: string;
      fullName: string;

      static fromEntity(_: TestEntity): DuplicateOneResponse {
        return { ref: _.id, fullName: _.field1 };
      }
    }

    DuplicateOneGateway = DuplicateOneGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: DuplicateOneResponse } },
    );

    const duplicateOneGateway = new DuplicateOneGateway(service, jwtService);
    service.duplicateOne.mockResolvedValueOnce(fakeEntity);
    const presenter = { ref: '1', fullName: 'test' };

    await expect(duplicateOneGateway.duplicateOne(socket, body)).resolves.toEqual({
      event: 'duplicate-one-test-entity',
      data: presenter,
    });
    expect(service.duplicateOne).toHaveBeenCalledTimes(1);
    expect(service.duplicateOne).toHaveBeenCalledWith(body.id, {});
  });
});
