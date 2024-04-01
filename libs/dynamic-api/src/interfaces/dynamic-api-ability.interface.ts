import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

type AbilityPredicate<Entity extends BaseEntity, User = any> = (entity: Entity, user: User) => boolean;

type RegisterAbilityPredicate<User = any> = (user: User) => boolean;

type ControllerAbilityPredicate<Entity extends BaseEntity> = {
  targets: RouteType[];
  predicate: AbilityPredicate<Entity>;
};

export {
  ControllerAbilityPredicate,
  RegisterAbilityPredicate,
  AbilityPredicate,
};
