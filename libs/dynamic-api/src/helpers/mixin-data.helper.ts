import { Type } from '@nestjs/common';
import { kebabCase } from 'lodash';
import {
  AbilityPredicate,
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';
import { getDisplayedName } from './format.helper';

function getMixinData<Entity extends BaseEntity>(
  entity: Type<Entity>,
  {
    apiTag,
    isPublic: isPublicController,
    abilityPredicates: controllerAbilityPredicates,
  }: DynamicApiControllerOptions<Entity>,
  {
    type: routeType,
    subPath,
    description,
    isPublic: isPublicRoute,
    abilityPredicate: routeAbilityPredicate,
    eventName,
  }: DynamicAPIRouteConfig<Entity>,
  isGateway = false,
): {
  routeType: RouteType;
  displayedName: string;
  description: string;
  isPublic: boolean;
  abilityPredicate: AbilityPredicate<Entity>;
  event?: string;
} {
  const displayedName = getDisplayedName(apiTag,  entity.name, subPath);

  let isPublic: boolean;
  if (typeof isPublicRoute === 'boolean') {
    isPublic = isPublicRoute;
  } else if (typeof isPublicController === 'boolean') {
    isPublic = isPublicController;
  } else {
    isPublic = false;
  }

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  return {
    routeType,
    displayedName,
    description,
    isPublic,
    abilityPredicate,
    ...(isGateway && { event: eventName ?? kebabCase(`${routeType}/${displayedName}`) }),
  };
}

export { getMixinData };
