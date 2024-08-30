import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { BaseGateway } from '../../gateways';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, ExtendedSocket } from '../../interfaces';
import { BaseEntity } from '../../models';
import { UpdateManyGatewayConstructor } from './update-many-gateway.interface';
import { UpdateManyGatewayMixin } from './update-many-gateway.mixin';
import { UpdateManyService } from './update-many-service.interface';

describe('UpdateManyGatewayMixin', () => {
  class TestEntity extends BaseEntity {
    field1: string;
  }

  let UpdateManyGateway: UpdateManyGatewayConstructor<TestEntity>;
  const socket = {} as ExtendedSocket<TestEntity>;

  const service = createMock<UpdateManyService<TestEntity>>();
  const jwtService = createMock<JwtService>();

  const controllerOptions = {
    path: 'test',
  } as DynamicApiControllerOptions<TestEntity>;
  const routeConfig = {
    type: 'UpdateMany',
  } as DynamicAPIRouteConfig<TestEntity>;

  const fakeEntity = { field1: 'test' } as TestEntity;
  const body = {
    ids: ['1', '2', '3'],
    field1: 'test',
  };

  it('should return a class that extends BaseGateway and implements UpdateManyGateway', () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    expect(UpdateManyGateway.prototype).toBeInstanceOf(BaseGateway);
    expect(UpdateManyGateway.name).toBe('BaseUpdateManyTestEntityGateway');
  });

  test.each([
    ['no entity field is in body', { ids: ['1', '2', '3'] }],
    ['ids is not in the body', { field1: 'test' } as any],
    ['ids is not an array', { ids: '1', field1: 'test' } as any],
  ])('should throw an exception if %s', async (_, body) => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    await expect(updateManyGateway.updateMany(socket, body)).rejects.toThrow(new WsException('Invalid request body'));
  });

  it('should call the service and return event and data', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      routeConfig,
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'update-many-test-entity',
      data: [fakeEntity],
    });

    expect(service.updateMany).toHaveBeenCalledWith(body.ids, { field1: 'test' });
  });

  it('should use eventName from routeConfig if provided', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, eventName: 'custom-event' },
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'custom-event',
      data: [fakeEntity],
    });
  });

  it('should use subPath in eventName if provided', async () => {
    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, subPath: 'sub' },
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'update-many-sub-test-entity',
      data: [fakeEntity],
    });
  });

  it('should map body to entity if body dto has toEntity method', async () => {
    class UpdateManyData {
      fullName: string;

      static toEntity(_: UpdateManyData) {
        return { field1: _.fullName };
      }
    }

    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { body: UpdateManyData } },
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);
    const body = { ids: ['1', '2', '3'], fullName: 'test' };

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'update-many-test-entity',
      data: [fakeEntity],
    });

    expect(service.updateMany).toHaveBeenCalledWith(body.ids, { field1: 'test' });
  });

  it('should map entities to response if presenter dto has fromEntities method', async () => {
    class UpdateManyPresenter {
      fullName: string;

      static fromEntities(_: TestEntity[]) {
        return _.map(({ field1 }) => ({ fullName: field1 }));
      }
    }

    UpdateManyGateway = UpdateManyGatewayMixin(
      TestEntity,
      controllerOptions,
      { ...routeConfig, dTOs: { presenter: UpdateManyPresenter } },
    );

    const updateManyGateway = new UpdateManyGateway(service, jwtService);

    service.updateMany.mockResolvedValueOnce([fakeEntity]);

    await expect(updateManyGateway.updateMany(socket, body)).resolves.toEqual({
      event: 'update-many-test-entity',
      data: [{ fullName: 'test' }],
    });
  });
});
