import { BaseEntity } from '../models';
import { CallbackMethods } from './dynamic-api-service-callback.interface';

/**
 * Context provided to `beforeSaveCallback` for `CreateOne` routes.
 *
 * @typeParam Entity - The Mongoose entity being created.
 * @typeParam BodyDTO - The body DTO type received by the controller. Defaults to `Entity`.
 *   Pass a custom DTO type to get full type safety on `toCreate` when using `dTOs.body`.
 *
 * @example
 * // Default — toCreate is Partial<Message>
 * type Ctx = BeforeSaveCreateContext<Message>;
 *
 * @example
 * // Custom body DTO — toCreate is Partial<CreateMessageDto>
 * type Ctx = BeforeSaveCreateContext<Message, CreateMessageDto>;
 */
type BeforeSaveCreateContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  toCreate: Partial<BodyDTO>;
}

/**
 * Context provided to `beforeSaveCallback` for `CreateMany` routes.
 *
 * @typeParam Entity - The Mongoose entity being created.
 * @typeParam BodyDTO - The body DTO type received by the controller. Defaults to `Entity`.
 */
type BeforeSaveCreateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  toCreate: Partial<BodyDTO>[];
}

/**
 * Context provided to `beforeSaveCallback` for `UpdateOne` routes.
 *
 * @typeParam Entity - The Mongoose entity being updated.
 * @typeParam BodyDTO - The body DTO type received by the controller. Defaults to `Entity`.
 */
type BeforeSaveUpdateContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  id: string;
  update: Partial<BodyDTO>;
}

/**
 * Context provided to `beforeSaveCallback` for `UpdateMany` routes.
 *
 * @typeParam Entity - The Mongoose entity being updated.
 * @typeParam BodyDTO - The body DTO type received by the controller. Defaults to `Entity`.
 */
type BeforeSaveUpdateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  ids: string[];
  update: Partial<BodyDTO>;
}

/**
 * Context provided to `beforeSaveCallback` for `ReplaceOne` routes.
 *
 * @typeParam Entity - The Mongoose entity being replaced.
 * @typeParam BodyDTO - The body DTO type received by the controller. Defaults to `Entity`.
 */
type BeforeSaveReplaceContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  id: string;
  replacement: Partial<BodyDTO>;
}

type BeforeSaveDeleteContext = {
  id: string;
}

type BeforeSaveDeleteManyContext = {
  ids: string[];
}

/**
 * Context provided to `beforeSaveCallback` for `DuplicateOne` routes.
 *
 * @typeParam Entity - The Mongoose entity being duplicated.
 * @typeParam BodyDTO - The body DTO type for optional override fields. Defaults to `Entity`.
 */
type BeforeSaveDuplicateContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  id: string;
  override?: Partial<BodyDTO>;
}

/**
 * Context provided to `beforeSaveCallback` for `DuplicateMany` routes.
 *
 * @typeParam Entity - The Mongoose entity being duplicated.
 * @typeParam BodyDTO - The body DTO type for optional override fields. Defaults to `Entity`.
 */
type BeforeSaveDuplicateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = {
  ids: string[];
  override?: Partial<BodyDTO>;
}

/**
 * Context provided to `beforeSaveCallback` for the `register` auth route.
 *
 * Available immediately after the password is hashed and before the user document is persisted.
 * Use it to set `role`, validate business rules, or strip extra request fields.
 *
 * @example
 * import { BeforeRegisterContext, BeforeSaveCallback } from 'mongodb-dynamic-api';
 *
 * const beforeRegister: BeforeSaveCallback<User, BeforeRegisterContext> =
 *   async (user, ctx, methods) => ({
 *     ...user,
 *     role: 'member',
 *     password: ctx.hashedPassword,
 *   });
 */
type BeforeRegisterContext = {
  /** Bcrypt-hashed password, ready to be persisted. */
  hashedPassword: string;
};

type BeforeSaveCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<Partial<Entity>>;

type BeforeSaveListCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[] | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<Partial<Entity>[]>;

type BeforeSaveDeleteCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

type BeforeSaveDeleteManyCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[],
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

/**
 * @deprecated
 * `AnyBeforeSaveCallback` is no longer needed when using `DynamicApiRouteConfig` (discriminated union).
 * Each per-route config type (`CreateOneRouteConfig`, `UpdateOneRouteConfig`, …) already carries a
 * precisely-typed `beforeSaveCallback` — no cast or wide union type is required in application code.
 * This type is kept for backwards compatibility with generic helpers and will be removed in v5.
 */
type AnyBeforeSaveCallback<Entity extends BaseEntity, User = unknown> =
  | BeforeSaveCallback<Entity, unknown, User>
  | BeforeSaveListCallback<Entity, unknown, User>
  | BeforeSaveDeleteCallback<Entity, unknown, User>
  | BeforeSaveDeleteManyCallback<Entity, unknown, User>;

/**
 * Pre-delete hook for `DeleteOne` routes.
 * Runs **before** the MongoDB delete and **outside** the error-catch block,
 * so any exception thrown (e.g. `ForbiddenException`, `BadRequestException`)
 * propagates correctly as an HTTP error to the client.
 *
 * Unlike `beforeSaveCallback`, throwing here guarantees the document is **not** deleted.
 */
type BeforeDeleteCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entity: Entity | undefined,
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

/**
 * Pre-delete hook for `DeleteMany` routes.
 * Same propagation guarantees as {@link BeforeDeleteCallback}.
 */
type BeforeDeleteManyCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = (
  entities: Entity[],
  context: Context,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

type AnyBeforeDeleteCallback<Entity extends BaseEntity, User = unknown> =
  | BeforeDeleteCallback<Entity, BeforeSaveDeleteContext, User>
  | BeforeDeleteManyCallback<Entity, BeforeSaveDeleteManyContext, User>;

// --- Deprecated aliases ---
/** @deprecated Use `BeforeSaveCreateContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveCreateContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveCreateContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveCreateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveCreateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveCreateManyContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveUpdateContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveUpdateContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveUpdateContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveUpdateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveUpdateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveUpdateManyContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveReplaceContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveReplaceContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveReplaceContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveDeleteContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteContext = BeforeSaveDeleteContext;
/** @deprecated Use `BeforeSaveDeleteManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteManyContext = BeforeSaveDeleteManyContext;
/** @deprecated Use `BeforeSaveDuplicateContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDuplicateContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveDuplicateContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveDuplicateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDuplicateManyContext<Entity extends BaseEntity, BodyDTO = Entity> = BeforeSaveDuplicateManyContext<Entity, BodyDTO>;
/** @deprecated Use `BeforeSaveCallback` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = BeforeSaveCallback<Entity, Context, User>;
/** @deprecated Use `BeforeSaveListCallback` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveListCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = BeforeSaveListCallback<Entity, Context, User>;
/** @deprecated Use `BeforeSaveDeleteCallback` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = BeforeSaveDeleteCallback<Entity, Context, User>;
/** @deprecated Use `BeforeSaveDeleteManyCallback` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteManyCallback<Entity extends BaseEntity, Context = Record<string, unknown>, User = unknown> = BeforeSaveDeleteManyCallback<Entity, Context, User>;

export type {
  AnyBeforeDeleteCallback,
  BeforeDeleteCallback,
  BeforeDeleteManyCallback,
  AnyBeforeSaveCallback,
  BeforeSaveCallback,
  BeforeSaveListCallback,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteManyCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
  BeforeSaveReplaceContext,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  BeforeRegisterContext,
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceBeforeSaveListCallback,
  DynamicApiServiceBeforeSaveDeleteCallback,
  DynamicApiServiceBeforeSaveDeleteManyCallback,
  DynamicApiServiceBeforeSaveCreateContext,
  DynamicApiServiceBeforeSaveCreateManyContext,
  DynamicApiServiceBeforeSaveUpdateContext,
  DynamicApiServiceBeforeSaveUpdateManyContext,
  DynamicApiServiceBeforeSaveReplaceContext,
  DynamicApiServiceBeforeSaveDeleteContext,
  DynamicApiServiceBeforeSaveDeleteManyContext,
  DynamicApiServiceBeforeSaveDuplicateContext,
  DynamicApiServiceBeforeSaveDuplicateManyContext,
};
