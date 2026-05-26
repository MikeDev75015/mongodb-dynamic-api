import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate, PredicateBehavior } from './dynamic-api-ability.interface';
import { BroadcastConfig } from './dynamic-api-broadcast-config.interface';
import { CascadeConfig } from './dynamic-api-cascade-config.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import {
  BeforeDeleteCallback,
  BeforeDeleteManyCallback,
  BeforeSaveCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  BeforeSaveListCallback,
  BeforeSaveReplaceContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
} from './dynamic-api-service-before-save-callback.interface';
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

/**
 * Common fields shared by every route configuration.
 * Do not use directly — extend or pick from the specific per-route config type.
 */
interface BaseRouteConfig<Entity extends BaseEntity> {
  isPublic?: boolean;
  disableCache?: boolean;
  description?: string;
  version?: string;
  subPath?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
  predicateBehavior?: PredicateBehavior;
  callback?: AfterSaveCallback<Entity>;
  webSocket?: DynamicApiWebSocketOptions;
  eventName?: string;
  broadcast?: BroadcastConfig<Entity>;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
  fromUser?: FromUserMap<Entity>;
}

/** Route config for `CreateOne` — `beforeSaveCallback` receives {@link BeforeSaveCreateContext}. */
interface CreateOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'CreateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveCreateContext<Entity>>;
}

/** Route config for `CreateMany` — `beforeSaveCallback` receives {@link BeforeSaveCreateManyContext}. */
interface CreateManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'CreateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveCreateManyContext<Entity>>;
}

/** Route config for `UpdateOne` — `beforeSaveCallback` receives {@link BeforeSaveUpdateContext}. */
interface UpdateOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'UpdateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveUpdateContext<Entity>>;
}

/** Route config for `UpdateMany` — `beforeSaveCallback` receives {@link BeforeSaveUpdateManyContext}. */
interface UpdateManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'UpdateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveUpdateManyContext<Entity>>;
}

/** Route config for `ReplaceOne` — `beforeSaveCallback` receives {@link BeforeSaveReplaceContext}. */
interface ReplaceOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'ReplaceOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveReplaceContext<Entity>>;
}

/** Route config for `DuplicateOne` — `beforeSaveCallback` receives {@link BeforeSaveDuplicateContext}. */
interface DuplicateOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'DuplicateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveDuplicateContext<Entity>>;
}

/** Route config for `DuplicateMany` — `beforeSaveCallback` receives {@link BeforeSaveDuplicateManyContext}. */
interface DuplicateManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'DuplicateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveDuplicateManyContext<Entity>>;
}

/** Route config for `DeleteOne` — `beforeSaveCallback` receives {@link BeforeSaveDeleteContext}. */
interface DeleteOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'DeleteOne';
  beforeSaveCallback?: BeforeSaveDeleteCallback<Entity, BeforeSaveDeleteContext>;
  /**
   * Pre-delete hook executed **before** the MongoDB delete operation and **outside**
   * the internal error-catch block. Any exception thrown (e.g. `ForbiddenException`,
   * `BadRequestException`) propagates as a proper HTTP error to the client and
   * **aborts** the delete.
   */
  beforeDeleteCallback?: BeforeDeleteCallback<Entity, BeforeSaveDeleteContext>;
  /**
   * Cascade delete configuration. After a successful parent delete, each entry
   * triggers deletion of child documents that reference the parent via `foreignKey`.
   * Only entries whose `on` value matches the delete mode (`'delete'` for hard-delete,
   * `'softDelete'` for soft-delete) are executed.
   */
  cascade?: CascadeConfig[];
}

/** Route config for `DeleteMany` — `beforeSaveCallback` receives {@link BeforeSaveDeleteManyContext}. */
interface DeleteManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'DeleteMany';
  beforeSaveCallback?: BeforeSaveDeleteManyCallback<Entity, BeforeSaveDeleteManyContext>;
  /**
   * Pre-delete hook executed **before** the MongoDB delete operation and **outside**
   * the internal error-catch block. Any exception thrown (e.g. `ForbiddenException`,
   * `BadRequestException`) propagates as a proper HTTP error to the client and
   * **aborts** the delete.
   */
  beforeDeleteCallback?: BeforeDeleteManyCallback<Entity, BeforeSaveDeleteManyContext>;
  /**
   * Cascade delete configuration. After a successful parent delete, each entry
   * triggers deletion of child documents that reference the parent via `foreignKey`.
   * Only entries whose `on` value matches the delete mode (`'delete'` for hard-delete,
   * `'softDelete'` for soft-delete) are executed.
   */
  cascade?: CascadeConfig[];
}

/** Route config for `GetOne` — no `beforeSaveCallback`. */
interface GetOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'GetOne';
}

/** Route config for `GetMany` — no `beforeSaveCallback`. */
interface GetManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'GetMany';
}

/** Route config for `Aggregate` — no `beforeSaveCallback`. */
interface AggregateRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'Aggregate';
}

/** Route config for `Custom` operation routes — no `beforeSaveCallback`. */
interface CustomOperationRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'Custom';
}

/**
 * Discriminated union of all per-route configuration types.
 * TypeScript narrows `beforeSaveCallback` to the exact context type for each `type` discriminant,
 * eliminating the need for manual casts when writing typed callbacks.
 *
 * @example
 * // CreateOne — ctx is BeforeSaveCreateContext<User>, no cast needed
 * const cfg: DynamicApiRouteConfig<User> = {
 *   type: 'CreateOne',
 *   beforeSaveCallback: async (_entity, ctx, _methods) => ({ ...ctx.toCreate }),
 * };
 */
type DynamicApiRouteConfig<Entity extends BaseEntity> =
  | CreateOneRouteConfig<Entity>
  | CreateManyRouteConfig<Entity>
  | UpdateOneRouteConfig<Entity>
  | UpdateManyRouteConfig<Entity>
  | ReplaceOneRouteConfig<Entity>
  | DuplicateOneRouteConfig<Entity>
  | DuplicateManyRouteConfig<Entity>
  | DeleteOneRouteConfig<Entity>
  | DeleteManyRouteConfig<Entity>
  | GetOneRouteConfig<Entity>
  | GetManyRouteConfig<Entity>
  | AggregateRouteConfig<Entity>
  | CustomOperationRouteConfig<Entity>;

/**
 * @deprecated Use `DynamicApiRouteConfig` instead. Will be removed in v5.
 */
type DynamicAPIRouteConfig<Entity extends BaseEntity> = DynamicApiRouteConfig<Entity>;

export {
  BaseRouteConfig,
  CreateOneRouteConfig,
  CreateManyRouteConfig,
  UpdateOneRouteConfig,
  UpdateManyRouteConfig,
  ReplaceOneRouteConfig,
  DuplicateOneRouteConfig,
  DuplicateManyRouteConfig,
  DeleteOneRouteConfig,
  DeleteManyRouteConfig,
  GetOneRouteConfig,
  GetManyRouteConfig,
  AggregateRouteConfig,
  CustomOperationRouteConfig,
  DynamicApiRouteConfig,
  DynamicAPIRouteConfig,
  FromUserMap,
};
