import { AbilityTuple, MatchConditions, PureAbility } from '@casl/ability';
import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

type AppAbility<Entity extends BaseEntity> = PureAbility<AbilityTuple, MatchConditions<Entity>>;

const lambdaMatcher = <Entity extends BaseEntity>(matchConditions: MatchConditions<Entity>) => matchConditions;

type RouteAbilityPredicate<Entity extends BaseEntity, User = any> = (entity: Entity, user: User) => boolean;

type RegisterAbilityPredicate<User = any> = (user: User) => boolean;

type ControllerAbilityPredicate<Entity extends BaseEntity> = {
  targets: RouteType[];
  predicate: RouteAbilityPredicate<Entity>;
};

export {
  AppAbility,
  ControllerAbilityPredicate,
  RegisterAbilityPredicate,
  RouteAbilityPredicate,
  lambdaMatcher,
};
