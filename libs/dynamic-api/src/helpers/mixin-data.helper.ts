import { Type } from '@nestjs/common';
import { kebabCase } from './lodash.helper';
import { DynamicApiEventRegistryStore } from './event-registry.store';
import { MongoDBDynamicApiLogger } from '../logger';
// Imported from its concrete file, not the `../services` barrel: that barrel also re-exports
// DynamicApiBroadcastService, which itself imports this very helpers barrel — going through it
// here would re-create the cycle this direct import is meant to avoid.
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import {
  AbilityPredicate,
  BroadcastConfig,
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  PredicateBehavior,
  RouteType,
} from '../interfaces';
import { BaseEntity } from '../models';
import { getPredicateFromControllerAbilityPredicates } from './controller-ability-predicates.helper';
import { getDisplayedName } from './format.helper';

/**
 * Route types where `predicateBehavior: 'filter'` is actually implemented (the service filters
 * fetched documents post-fetch) — see route-config.md's `predicateBehavior` scope note. These are
 * also `GET` routes eligible for `DynamicApiCacheInterceptor` caching, which is what makes
 * combining `'filter'` with an active cache worth flagging for a non-public (per-caller) route:
 * see the boot-time warning below. A `isPublic: true` route is exempt — its response is, by
 * definition, meant to be shared by every caller regardless of identity, which is exactly what a
 * cached `'filter'`-mode response already does.
 */
const FILTER_MODE_ROUTE_TYPES: RouteType[] = ['GetMany', 'Aggregate'];

const logger = new MongoDBDynamicApiLogger('DynamicApiModule');

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function getMixinData<Entity extends BaseEntity>(
  entity: Type<Entity>,
  {
    apiTag,
    isPublic: isPublicController,
    disableCache: disableCacheController,
    abilityPredicates: controllerAbilityPredicates,
  }: DynamicApiControllerOptions<Entity>,
  {
    type: routeType,
    subPath,
    description,
    isPublic: isPublicRoute,
    disableCache: disableCacheRoute,
    abilityPredicate: routeAbilityPredicate,
    predicateBehavior,
    eventName,
  }: DynamicAPIRouteConfig<Entity>,
  isGateway = false,
  broadcastConfig?: BroadcastConfig<Entity>,
): {
  routeType: RouteType;
  displayedName: string;
  description: string;
  isPublic: boolean;
  disableCache: boolean;
  abilityPredicate: AbilityPredicate<Entity>;
  predicateBehavior: PredicateBehavior | undefined;
  event: string;
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

  let disableCache: boolean;
  if (typeof disableCacheRoute === 'boolean') {
    disableCache = disableCacheRoute;
  } else if (typeof disableCacheController === 'boolean') {
    disableCache = disableCacheController;
  } else {
    disableCache = false;
  }

  const abilityPredicate = routeAbilityPredicate ?? getPredicateFromControllerAbilityPredicates(
    controllerAbilityPredicates,
    routeType,
  );

  if (
    !isGateway &&
    !isPublic &&
    abilityPredicate &&
    predicateBehavior === 'filter' &&
    !disableCache &&
    FILTER_MODE_ROUTE_TYPES.includes(routeType) &&
    DynamicApiGlobalStateService.getValue('isGlobalCacheEnabled')
  ) {
    logger.warn(
      `[Cache Safety] Route ${routeType} on ${entity.name}: predicateBehavior 'filter' combined with an `
      + `active response cache. In 'filter' mode the Guard performs no per-request check, so if the cache's `
      + `key doesn't vary per caller (see cacheOptions.keyBy), the response computed for the first caller `
      + `could be served as-is to a later caller with different permissions. Safe by default when `
      + `cacheOptions.keyBy is 'url+identity' (the default) and every caller is authenticated. Otherwise, `
      + `set disableCache: true on this route, use a predicateBehavior other than 'filter', or mark the `
      + `route isPublic: true if its filtered response is genuinely identical for every caller.`,
    );
  }

  const event = eventName ?? kebabCase(`${routeType}/${displayedName}`);

  if (broadcastConfig) {
    DynamicApiEventRegistryStore.register({
      event: broadcastConfig.eventName || event,
      routeType,
      entityName: entity.name,
      displayedName,
      channel: isGateway ? 'ws' : 'http',
      hasRoomTargeting: !!broadcastConfig.rooms,
      hasAbilityPredicate: typeof broadcastConfig.enabled === 'function',
      isCustomEventName: !!broadcastConfig.eventName,
    });
  }

  return {
    routeType,
    displayedName,
    description,
    isPublic,
    disableCache,
    abilityPredicate,
    predicateBehavior,
    event,
  };
}

export { getMixinData };
