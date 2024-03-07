import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

enum CaslAction {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

type DynamicApiCaslActionRoutesMap = Map<CaslAction, RouteType[]>;

type DynamicApiRouteCaslAbilityPredicate<Entity extends BaseEntity, T = any> = (entity: Entity, user?: T) => boolean;

type DynamicApiControllerCaslAbilityPredicate<Entity extends BaseEntity> = {
  targets: RouteType[] | DynamicApiCaslActionRoutesMap;
  predicate: DynamicApiRouteCaslAbilityPredicate<Entity>;
};

export {
  CaslAction,
  DynamicApiRouteCaslAbilityPredicate,
  DynamicApiControllerCaslAbilityPredicate,
  DynamicApiCaslActionRoutesMap,
};
