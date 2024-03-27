import { RouteType } from '../interfaces';
import { BaseEntity } from '../models';
import { getControllerMixinData } from './controller-mixin.helper';

describe('getControllerMixinData', () => {
  class TestEntity extends BaseEntity {}
  const controllerOptions = { path: '/', apiTag: 'Test', isPublic: true, abilityPredicates: [] };
  const routeConfig = { description: 'Test', dTOs: {}, isPublic: true, abilityPredicate: () => true };

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

  it('should return valid controller mixin data for CreateOne route type', () => {
    const result = getControllerMixinData(
      TestEntity,
      controllerOptions,
      {
        type: 'CreateOne',
        ...routeConfig,
      },
      'v1',
    );

    expect(result).toBeDefined();
    expect(result.routeType).toEqual('CreateOne');
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