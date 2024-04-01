import { RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { getControllerMixinData } from './controller-mixin.helper';

describe('getControllerMixinData', () => {
  class TestEntity extends BaseEntity {}
  const controllerOptions = { path: '/', apiTag: 'Test', isPublic: true, abilityPredicates: [] };
  const routeConfig = { description: 'Test', dTOs: {}, isPublic: true, abilityPredicate: () => true };
  class CustomDTO {}

  it('should return valid controller mixin data for CreateMany route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateMany',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateMany');
  });

  it('should return valid controller mixin data for CreateOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateOne',
        ...routeConfig,
        dTOs: { body: CustomDTO },
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateOne');
  });

  it('should return valid controller mixin data for DuplicateMany route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DuplicateMany',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateMany');
  });

  it('should return valid controller mixin data for DuplicateOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DuplicateOne',
        ...routeConfig,
        dTOs: { presenter: CustomDTO },
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DuplicateOne');
  });

  it('should return valid controller mixin data for DeleteMany route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DeleteMany',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DeleteMany');
  });

  it('should return valid controller mixin data for DeleteOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'DeleteOne',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('DeleteOne');
  });

  it('should return valid controller mixin data for GetMany route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetMany',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetMany');
  });

  it('should return valid controller mixin data for GetOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'GetOne',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('GetOne');
    expect(result.displayedName).toEqual('Test');
    expect(result.description).toEqual('Test');
    expect(result.isPublic).toEqual(true);
    expect(result.abilityPredicate).toBeDefined();
  });

  it('should return valid controller mixin data for ReplaceOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'ReplaceOne',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('ReplaceOne');
  });

  it('should return valid controller mixin data for UpdateMany route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'UpdateMany',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('UpdateMany');
  });

  it('should return valid controller mixin data for UpdateOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'UpdateOne',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('UpdateOne');
  });

  it('should throw an error for unsupported route type', () => {
    expect(() => getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'Unsupported' as RouteType,
        ...routeConfig,
      },
      'v1',
    )).toThrowError();
  });
});