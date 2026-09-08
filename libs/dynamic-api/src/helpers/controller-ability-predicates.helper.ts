import {
  AuthAbilityPredicate,
  ControllerAbilityPredicate,
  AbilityPredicate,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

/** @internal Not part of the public API. */
function getPredicateFromControllerAbilityPredicates<Entity extends BaseEntity>(
  controllerAbilityPredicates: ControllerAbilityPredicate<Entity>[],
  route: RouteType): AbilityPredicate<Entity> {
  let routePredicate: AbilityPredicate<Entity>;

  if (!controllerAbilityPredicates?.length) {
    return;
  }

  for (const controllerAbilityPredicate of controllerAbilityPredicates) {
    const { targets, predicate } = controllerAbilityPredicate;

    if (targets.includes(route)) {
      routePredicate = predicate;
      break;
    }
  }

  return routePredicate;
}

/** @internal Not part of the public API. @see ControllerAbilityPredicate.authAbilityPredicate */
function getAuthPredicateFromControllerAbilityPredicates<Entity extends BaseEntity>(
  controllerAbilityPredicates: ControllerAbilityPredicate<Entity>[],
  route: RouteType): AuthAbilityPredicate<unknown> {
  let routeAuthPredicate: AuthAbilityPredicate<unknown>;

  if (!controllerAbilityPredicates?.length) {
    return;
  }

  for (const controllerAbilityPredicate of controllerAbilityPredicates) {
    const { targets, authAbilityPredicate } = controllerAbilityPredicate;

    if (targets.includes(route)) {
      routeAuthPredicate = authAbilityPredicate;
      break;
    }
  }

  return routeAuthPredicate;
}

export { getPredicateFromControllerAbilityPredicates, getAuthPredicateFromControllerAbilityPredicates };
