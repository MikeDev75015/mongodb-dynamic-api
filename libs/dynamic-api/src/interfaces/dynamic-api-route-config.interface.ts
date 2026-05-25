import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate, PredicateBehavior } from './dynamic-api-ability.interface';
import { BroadcastConfig } from './dynamic-api-broadcast-config.interface';
import { CascadeConfig } from './dynamic-api-cascade-config.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { AnyBeforeDeleteCallback, AnyBeforeSaveCallback } from './dynamic-api-service-before-save-callback.interface';
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
  /**
   * Pre-delete hook executed **before** the MongoDB delete operation and **outside**
   * the internal error-catch block. Any exception thrown (e.g. `ForbiddenException`,
   * `BadRequestException`) propagates as a proper HTTP error to the client and
   * **aborts** the delete. Compatible with `DeleteOne` and `DeleteMany` routes only.
   */
  beforeDeleteCallback?: AnyBeforeDeleteCallback<Entity>;
  /**
   * Cascade delete configuration. After a successful parent delete, each entry
   * triggers deletion of child documents that reference the parent via `foreignKey`.
   * Only entries whose `on` value matches the delete mode (`'delete'` for hard-delete,
   * `'softDelete'` for soft-delete) are executed.
   */
  cascade?: CascadeConfig[];
  callback?: AfterSaveCallback<Entity>;
  webSocket?: DynamicApiWebSocketOptions;
  eventName?: string;
  broadcast?: BroadcastConfig<Entity>;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
  fromUser?: FromUserMap<Entity>;
}

/**
 * @deprecated Use `DynamicApiRouteConfig` instead. Will be removed in v5.
 */
type DynamicAPIRouteConfig<Entity extends BaseEntity> = DynamicApiRouteConfig<Entity>;

export { DynamicApiRouteConfig, DynamicAPIRouteConfig, FromUserMap };
