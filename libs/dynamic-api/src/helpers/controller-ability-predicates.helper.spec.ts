import { AbilityPredicate, RouteType } from '../interfaces';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';

describe('ControllerAbilityPredicatesHelper', () => {
  describe('getPredicateFromControllerAbilityPredicates', () => {
    const route: RouteType = 'GetMany';
    const routeNotConfigured: RouteType = 'CreateMany';
    const predicate: AbilityPredicate<any> = (entity, user) => !!user;

    const controllerAbilityPredicatesWithArray = [
      {
        targets: [route],
        predicate,
      },
    ];

    it('should return undefined if controllerAbilityPredicates is undefined', () => {
      const result = getPredicateFromControllerAbilityPredicates(undefined, route);

      expect(result).toBeUndefined();
    });

    it('should return undefined if controllerAbilityPredicates is empty', () => {
      const result = getPredicateFromControllerAbilityPredicates([], route);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the route is not in the targets array', () => {
      const result = getPredicateFromControllerAbilityPredicates(
        controllerAbilityPredicatesWithArray,
        routeNotConfigured,
      );

      expect(result).toBeUndefined();
    });

    it('should return the predicate if the route is in the targets array', () => {
      const result = getPredicateFromControllerAbilityPredicates(controllerAbilityPredicatesWithArray, route);

      expect(result).toBe(predicate);
    });
  });
});