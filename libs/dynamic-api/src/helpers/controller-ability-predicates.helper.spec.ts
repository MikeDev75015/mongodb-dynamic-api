import { CaslAction, DynamicApiRouteCaslAbilityPredicate, RouteType } from '../interfaces';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';

describe('ControllerAbilityPredicatesHelper', () => {
  describe('getPredicateFromControllerAbilityPredicates', () => {
    const route: RouteType = 'GetMany';
    const routeNotConfigured: RouteType = 'CreateMany';
    const predicate: DynamicApiRouteCaslAbilityPredicate<any> = (entity, user) => !!user;
    const predicate2: DynamicApiRouteCaslAbilityPredicate<any> = (entity, user) => !user;
    const actionMap: Map<CaslAction, RouteType[]> = new Map<CaslAction, RouteType[]>([
      [CaslAction.Read, [route]],
    ]);

    const controllerAbilityPredicatesWithArray = [
      {
        targets: [route],
        predicate,
      },
    ];

    const controllerAbilityPredicatesWithMap = [
      {
        targets: actionMap,
        predicate: predicate2,
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

    it('should return undefined if the route is not in the targets map', () => {
      const result = getPredicateFromControllerAbilityPredicates(
        controllerAbilityPredicatesWithMap,
        routeNotConfigured,
      );

      expect(result).toBeUndefined();
    });

    it('should return the predicate if the route is in the targets array', () => {
      const result = getPredicateFromControllerAbilityPredicates(controllerAbilityPredicatesWithArray, route);

      expect(result).toBe(predicate);
    });

    it('should return the predicate if the route is in the targets map', () => {
      const result = getPredicateFromControllerAbilityPredicates(controllerAbilityPredicatesWithMap, route);
      // Assert
      expect(result).toBe(predicate2);
    });
  });
});