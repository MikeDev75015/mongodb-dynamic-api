import { plainToInstance } from 'class-transformer';
import { BaseEntity } from '../models';
import { CreateManyBodyMixin } from '../routes';
import { getMixinData } from './mixin-data.helper';

describe('getMixinData', () => {
  class TestEntity extends BaseEntity {}
  const controllerOptions = { path: '/', apiTag: 'Test', isPublic: true, abilityPredicates: [] };
  const routeConfig = { description: 'Test', dTOs: {}, isPublic: true, abilityPredicate: () => true };
  class CustomDTO {}

  it('should return valid controller mixin data for CreateMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateMany',
        ...routeConfig,
      },
    );

    const body = { list: [{ unit: 'test' }] };
    const dto = plainToInstance(CreateManyBodyMixin(TestEntity), body);

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateMany');
    expect(dto).toHaveProperty('list');
    expect(dto.list).toHaveLength(1);
  });

  it('should return valid controller mixin data for CreateMany route type with custom body', () => {
    class CreateManyDTO {
      list: CustomDTO[];
    }
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateMany',
        ...routeConfig,
        dTOs: { body: CreateManyDTO },
      },
    );

    expect(result).toBeDefined();
  });

  it('should return valid controller mixin data for CreateOne route type', () => {
    const { abilityPredicate, isPublic, ...createOneRouteConfig } = routeConfig;
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateOne',
        ...createOneRouteConfig,
        dTOs: { body: CustomDTO },
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateOne');
  });

  it('should return valid controller mixin data for DuplicateMany route type', () => {
    const result = getMixinData(
      TestEntity,
      { ...controllerOptions, isPublic: undefined },
      {
        type: 'DuplicateMany',
        ...routeConfig,
        isPublic: undefined,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateMany');
  });

  it('should return valid controller mixin data for DuplicateOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DuplicateOne',
        ...routeConfig,
        dTOs: { presenter: CustomDTO },
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateOne');
  });

  it('should return valid controller mixin data for DeleteMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DeleteMany',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DeleteMany');
  });

  it('should return valid controller mixin data for DeleteOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DeleteOne',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DeleteOne');
  });

  it('should return valid controller mixin data for GetMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetMany',
        ...routeConfig,
        dTOs: undefined,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetMany');
  });

  it('should return valid controller mixin data for GetOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetOne',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetOne');
    expect(result.displayedName).toEqual('Test');
    expect(result.description).toEqual('Test');
    expect(result.isPublic).toEqual(true);
    expect(result.abilityPredicate).toBeDefined();
  });

  it('should return valid controller mixin data for ReplaceOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'ReplaceOne',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('ReplaceOne');
  });

  it('should return valid controller mixin data for UpdateMany route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'UpdateMany',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('UpdateMany');
  });

  it('should return valid controller mixin data for UpdateOne route type', () => {
    const result = getMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'UpdateOne',
        ...routeConfig,
      },
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('UpdateOne');
  });
});