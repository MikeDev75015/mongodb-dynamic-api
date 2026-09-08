import { BaseEntity } from '../models';
import { RouteType } from './dynamic-api-route-type.type';

type PredicateBehavior = 'filter' | 'throw';

type AbilityPredicate<Entity extends BaseEntity, User = any> = (entity: Entity, user: User) => boolean;

type AuthAbilityPredicate<User = any, Body = unknown> = (user: User, body?: Body) => boolean;

type BroadcastAbilityPredicate<ResponseData extends object, User = any> = (data: ResponseData, user: User) => boolean;

type BroadcastRooms<T extends object, User = unknown> = string | string[] | ((data: T, user?: User) => string | string[]);

type ControllerAbilityPredicate<Entity extends BaseEntity> = {
  targets: RouteType[];
  predicate: AbilityPredicate<Entity>;
  /**
   * User-level predicate applied the same way as `BaseRouteConfig.authAbilityPredicate` for
   * every route type listed in `targets` — checked against `(user, body)` alone, no document
   * read, no collection scan, so it can never fail open on an empty/near-empty collection the
   * way `predicate` can (see `BaseRouteConfig.authAbilityPredicate`'s doc comment). Optional:
   * `predicate` remains the per-document check; set this alongside it for a blanket guard (e.g.
   * "this whole route is admin-only") that stays safe regardless of how many documents match.
   */
  authAbilityPredicate?: AuthAbilityPredicate<unknown>;
};

export {
  PredicateBehavior,
  ControllerAbilityPredicate,
  AuthAbilityPredicate,
  AbilityPredicate,
  BroadcastAbilityPredicate,
  BroadcastRooms,
};
