import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate, PredicateBehavior } from './dynamic-api-ability.interface';
import { DynamicApiBroadcastConfig } from './dynamic-api-broadcast-config.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { AnyBeforeSaveCallback } from './dynamic-api-service-before-save-callback.interface';
import { AfterSaveCallback } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

/**
 * Maps entity fields to JWT claim names or extractor functions.
 * When a request is processed, the mapped values are injected into the body
 * before validation and persistence.
 *
 * @example
 * // Inject `req.user.email` into `createdBy`, run a function for `tenantId`
 * fromUser: {
 *   createdBy: 'email',
 *   tenantId: (user) => (user as JwtPayload).tenantId,
 * }
 */
type FromUserMap<Entity> = Partial<Record<keyof Entity, string | ((user: unknown) => unknown)>>;

interface DynamicApiRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  isPublic?: boolean;
  disableCache?: boolean;
  description?: string;
  version?: string;
  subPath?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
  predicateBehavior?: PredicateBehavior;
  beforeSaveCallback?: AnyBeforeSaveCallback<Entity>;
  callback?: AfterSaveCallback<Entity>;
  webSocket?: DynamicApiWebSocketOptions;
  eventName?: string;
  broadcast?: DynamicApiBroadcastConfig<Entity>;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
  fromUser?: FromUserMap<Entity>;
}

/**
 * @deprecated Use `DynamicApiRouteConfig` instead. Will be removed in v5.
 */
type DynamicAPIRouteConfig<Entity extends BaseEntity> = DynamicApiRouteConfig<Entity>;

export { DynamicApiRouteConfig, DynamicAPIRouteConfig, FromUserMap };
