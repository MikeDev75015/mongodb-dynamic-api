import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { PopulateOptions } from 'mongoose';
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
import { AfterSaveCallback, CallbackRetryOptions } from './dynamic-api-service-callback.interface';
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
  /**
   * Retry options for `callback`. Only applies to `callback` — `beforeSaveCallback`/
   * `beforeDeleteCallback` are never retried. See {@link CallbackRetryOptions}.
   */
  callbackRetry?: CallbackRetryOptions;
  webSocket?: DynamicApiWebSocketOptions;
  eventName?: string;
  broadcast?: BroadcastConfig<Entity>;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
  fromUser?: FromUserMap<Entity>;
}

/** Route config for `CreateOne` — `beforeSaveCallback` receives {@link BeforeSaveCreateContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class used with `dTOs.body`. Defaults to `Entity`.
 *   When provided, `ctx.toCreate` in `beforeSaveCallback` is typed as `Partial<BodyDTO>`.
 *
 * @example
 * ```typescript
 * const cfg: CreateOneRouteConfig<Message, CreateMessageDto> = {
 *   type: 'CreateOne',
 *   dTOs: { body: CreateMessageDto },
 *   beforeSaveCallback: async (_e, ctx, _m) => ({ text: ctx.toCreate.text }),
 *   //                              ^^^  ctx.toCreate is Partial<CreateMessageDto> — no cast
 * };
 * ```
 */
interface CreateOneRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'CreateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveCreateContext<Entity, BodyDTO>>;
}

/** Route config for `CreateMany` — `beforeSaveCallback` receives {@link BeforeSaveCreateManyContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class used with `dTOs.body`. Defaults to `Entity`.
 */
interface CreateManyRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'CreateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveCreateManyContext<Entity, BodyDTO>>;
}

/** Route config for `UpdateOne` — `beforeSaveCallback` receives {@link BeforeSaveUpdateContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class used with `dTOs.body`. Defaults to `Entity`.
 *   When provided, `ctx.update` in `beforeSaveCallback` is typed as `Partial<BodyDTO>`.
 *
 * @example
 * ```typescript
 * const cfg: UpdateOneRouteConfig<Message, ReactMessageBody> = {
 *   type: 'UpdateOne',
 *   dTOs: { body: ReactMessageBody },
 *   beforeSaveCallback: messageReactCallback, // no cast needed
 * };
 * ```
 */
interface UpdateOneRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'UpdateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveUpdateContext<Entity, BodyDTO>>;
}

/** Route config for `UpdateMany` — `beforeSaveCallback` receives {@link BeforeSaveUpdateManyContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class used with `dTOs.body`. Defaults to `Entity`.
 */
interface UpdateManyRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'UpdateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveUpdateManyContext<Entity, BodyDTO>>;
}

/** Route config for `ReplaceOne` — `beforeSaveCallback` receives {@link BeforeSaveReplaceContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class used with `dTOs.body`. Defaults to `Entity`.
 */
interface ReplaceOneRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'ReplaceOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveReplaceContext<Entity, BodyDTO>>;
}

/** Route config for `DuplicateOne` — `beforeSaveCallback` receives {@link BeforeSaveDuplicateContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class for override fields. Defaults to `Entity`.
 */
interface DuplicateOneRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'DuplicateOne';
  beforeSaveCallback?: BeforeSaveCallback<Entity, BeforeSaveDuplicateContext<Entity, BodyDTO>>;
}

/** Route config for `DuplicateMany` — `beforeSaveCallback` receives {@link BeforeSaveDuplicateManyContext}.
 *
 * @typeParam Entity  The Mongoose entity class.
 * @typeParam BodyDTO Body DTO class for override fields. Defaults to `Entity`.
 */
interface DuplicateManyRouteConfig<Entity extends BaseEntity, BodyDTO = Entity> extends BaseRouteConfig<Entity> {
  type: 'DuplicateMany';
  beforeSaveCallback?: BeforeSaveListCallback<Entity, BeforeSaveDuplicateManyContext<Entity, BodyDTO>>;
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

/**
 * Populate configuration for `GetOne`/`GetMany` — the same shape Mongoose's own
 * `Query.populate()` accepts: a path, a `PopulateOptions` object, or an array of either.
 *
 * @example
 * ```typescript
 * populate: 'author'
 * populate: { path: 'author', select: 'name email' }
 * populate: ['author', { path: 'comments', populate: 'author' }]
 * ```
 */
type PopulateConfig = string | PopulateOptions | (string | PopulateOptions)[];

/**
 * Route config for `GetOne` — no `beforeSaveCallback`.
 * `populate` is always applied server-side (static, not client-controlled) to avoid
 * exposing arbitrary relations/performance cost through the request.
 */
interface GetOneRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'GetOne';
  populate?: PopulateConfig;
}

/**
 * Route config for `GetMany` — no `beforeSaveCallback`.
 * `populate` is always applied server-side (static, not client-controlled) to avoid
 * exposing arbitrary relations/performance cost through the request.
 */
interface GetManyRouteConfig<Entity extends BaseEntity> extends BaseRouteConfig<Entity> {
  type: 'GetMany';
  populate?: PopulateConfig;
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

// ─── Callback helpers — eliminate `as never` casts when using dTOs.body ──────

/**
 * Narrows a `BeforeSaveCallback` to the exact typed context for a `CreateOne` route,
 * propagating a custom `BodyDTO`.
 *
 * Use this helper when you define a callback outside the route config object and TypeScript
 * cannot infer `BodyDTO` from `dTOs.body`.
 *
 * @example
 * ```typescript
 * import { defineCreateCallback, BeforeSaveCreateContext } from 'mongodb-dynamic-api';
 *
 * const beforeCreate = defineCreateCallback<Message, CreateMessageDto>(
 *   async (_e, ctx, _m) => ({ text: ctx.toCreate.text }),
 * );
 *
 * // In the route config — no cast needed:
 * { type: 'CreateOne', dTOs: { body: CreateMessageDto }, beforeSaveCallback: beforeCreate }
 * ```
 */
function defineCreateCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveCallback<Entity, BeforeSaveCreateContext<Entity, BodyDTO>>,
): BeforeSaveCallback<Entity, BeforeSaveCreateContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveListCallback` to the exact typed context for a `CreateMany` route.
 * @see {@link defineCreateCallback} for usage pattern.
 */
function defineCreateManyCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveListCallback<Entity, BeforeSaveCreateManyContext<Entity, BodyDTO>>,
): BeforeSaveListCallback<Entity, BeforeSaveCreateManyContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveCallback` to the exact typed context for an `UpdateOne` route,
 * propagating a custom `BodyDTO`.
 *
 * @example
 * ```typescript
 * import { defineUpdateCallback } from 'mongodb-dynamic-api';
 *
 * const reactCallback = defineUpdateCallback<Message, ReactMessageBody>(
 *   async (_e, ctx, _m) => ({ reaction: ctx.update.emojiId }),
 * );
 *
 * // In the route config — no cast needed:
 * { type: 'UpdateOne', dTOs: { body: ReactMessageBody }, beforeSaveCallback: reactCallback }
 * ```
 */
function defineUpdateCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveCallback<Entity, BeforeSaveUpdateContext<Entity, BodyDTO>>,
): BeforeSaveCallback<Entity, BeforeSaveUpdateContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveListCallback` to the exact typed context for an `UpdateMany` route.
 * @see {@link defineUpdateCallback} for usage pattern.
 */
function defineUpdateManyCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveListCallback<Entity, BeforeSaveUpdateManyContext<Entity, BodyDTO>>,
): BeforeSaveListCallback<Entity, BeforeSaveUpdateManyContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveCallback` to the exact typed context for a `ReplaceOne` route.
 * @see {@link defineUpdateCallback} for usage pattern.
 */
function defineReplaceCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveCallback<Entity, BeforeSaveReplaceContext<Entity, BodyDTO>>,
): BeforeSaveCallback<Entity, BeforeSaveReplaceContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveCallback` to the exact typed context for a `DuplicateOne` route.
 * @see {@link defineUpdateCallback} for usage pattern.
 */
function defineDuplicateCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveCallback<Entity, BeforeSaveDuplicateContext<Entity, BodyDTO>>,
): BeforeSaveCallback<Entity, BeforeSaveDuplicateContext<Entity, BodyDTO>> {
  return cb;
}

/**
 * Narrows a `BeforeSaveListCallback` to the exact typed context for a `DuplicateMany` route.
 * @see {@link defineUpdateCallback} for usage pattern.
 */
function defineDuplicateManyCallback<Entity extends BaseEntity, BodyDTO = Entity>(
  cb: BeforeSaveListCallback<Entity, BeforeSaveDuplicateManyContext<Entity, BodyDTO>>,
): BeforeSaveListCallback<Entity, BeforeSaveDuplicateManyContext<Entity, BodyDTO>> {
  return cb;
}

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
  PopulateConfig,
  AggregateRouteConfig,
  CustomOperationRouteConfig,
  DynamicApiRouteConfig,
  DynamicAPIRouteConfig,
  FromUserMap,
  defineCreateCallback,
  defineCreateManyCallback,
  defineUpdateCallback,
  defineUpdateManyCallback,
  defineReplaceCallback,
  defineDuplicateCallback,
  defineDuplicateManyCallback,
};
