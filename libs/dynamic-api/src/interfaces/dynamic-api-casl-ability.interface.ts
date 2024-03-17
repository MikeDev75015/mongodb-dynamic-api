import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

type DynamicApiRouteCaslAbilityPredicate<Entity extends BaseEntity, T = any> = (entity: Entity, user?: T) => boolean;

type DynamicApiRegisterAbilityPredicate<T = any> = (user?: T) => boolean;

type DynamicApiControllerAbilityPredicate<Entity extends BaseEntity> = {
  targets: RouteType[];
  predicate: DynamicApiRouteCaslAbilityPredicate<Entity>;
};

export {
  DynamicApiRouteCaslAbilityPredicate,
  DynamicApiRegisterAbilityPredicate,
  DynamicApiControllerAbilityPredicate,
};
