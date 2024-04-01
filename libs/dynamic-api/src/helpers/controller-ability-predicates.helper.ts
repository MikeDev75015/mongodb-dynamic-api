import {
  ControllerAbilityPredicate,
  AbilityPredicate,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';

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

export { getPredicateFromControllerAbilityPredicates };
