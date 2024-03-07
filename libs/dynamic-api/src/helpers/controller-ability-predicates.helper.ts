import {
  DynamicApiCaslActionRoutesMap,
  DynamicApiControllerCaslAbilityPredicate,
  DynamicApiRouteCaslAbilityPredicate,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

function getPredicateFromControllerAbilityPredicates<Entity extends BaseEntity>(
  controllerAbilityPredicates: DynamicApiControllerCaslAbilityPredicate<Entity>[],
  route: RouteType): DynamicApiRouteCaslAbilityPredicate<Entity> {
  let routePredicate: DynamicApiRouteCaslAbilityPredicate<Entity>;

  if (!controllerAbilityPredicates?.length) {
    return;
  }

  for (const controllerAbilityPredicate of controllerAbilityPredicates) {
    const { targets, predicate } = controllerAbilityPredicate;

    if (Array.isArray(targets) && targets.includes(route)) {
      routePredicate = predicate;
      break;
    }

    (targets as DynamicApiCaslActionRoutesMap).forEach((routes) => {
      if (routes.includes(route) && !routePredicate) {
        routePredicate = predicate;
      }
    });
  }

  return routePredicate;
}

export { getPredicateFromControllerAbilityPredicates };
