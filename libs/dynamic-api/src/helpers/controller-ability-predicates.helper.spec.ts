import { describe, expect, it } from 'vitest';
import { AbilityPredicate, AuthAbilityPredicate, RouteType } from '../interfaces';
import {
  getAuthPredicateFromControllerAbilityPredicates,
  getPredicateFromControllerAbilityPredicates,
} from './controller-ability-predicates.helper';

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

  describe('getAuthPredicateFromControllerAbilityPredicates', () => {
    const route: RouteType = 'GetMany';
    const routeNotConfigured: RouteType = 'CreateMany';
    const predicate: AbilityPredicate<any> = (entity, user) => !!user;
    const authAbilityPredicate: AuthAbilityPredicate<unknown> = (user) => !!user;

    const controllerAbilityPredicatesWithArray = [
      {
        targets: [route],
        predicate,
        authAbilityPredicate,
      },
    ];

    it('should return undefined if controllerAbilityPredicates is undefined', () => {
      const result = getAuthPredicateFromControllerAbilityPredicates(undefined, route);

      expect(result).toBeUndefined();
    });

    it('should return undefined if controllerAbilityPredicates is empty', () => {
      const result = getAuthPredicateFromControllerAbilityPredicates([], route);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the route is not in the targets array', () => {
      const result = getAuthPredicateFromControllerAbilityPredicates(
        controllerAbilityPredicatesWithArray,
        routeNotConfigured,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined if the matching entry has no authAbilityPredicate', () => {
      const result = getAuthPredicateFromControllerAbilityPredicates(
        [{ targets: [route], predicate }],
        route,
      );

      expect(result).toBeUndefined();
    });

    it('should return the authAbilityPredicate if the route is in the targets array', () => {
      const result = getAuthPredicateFromControllerAbilityPredicates(controllerAbilityPredicatesWithArray, route);

      expect(result).toBe(authAbilityPredicate);
    });
  });
});