import { BaseEntity } from '../models';
import { CallbackMethods } from './dynamic-api-service-callback.interface';

type BeforeSaveCreateContext<Entity extends BaseEntity> = {
  toCreate: Partial<Entity>;
}

type BeforeSaveCreateManyContext<Entity extends BaseEntity> = {
  toCreate: Partial<Entity>[];
}

type BeforeSaveUpdateContext<Entity extends BaseEntity> = {
  id: string;
  update: Partial<Entity>;
}

type BeforeSaveUpdateManyContext<Entity extends BaseEntity> = {
  ids: string[];
  update: Partial<Entity>;
}

type BeforeSaveReplaceContext<Entity extends BaseEntity> = {
  id: string;
  replacement: Partial<Entity>;
}

type BeforeSaveDeleteContext = {
  id: string;
}

type BeforeSaveDeleteManyContext = {
  ids: string[];
}

type BeforeSaveDuplicateContext<Entity extends BaseEntity> = {
  id: string;
  override?: Partial<Entity>;
}

type BeforeSaveDuplicateManyContext<Entity extends BaseEntity> = {
  ids: string[];
  override?: Partial<Entity>;
}

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
type DynamicApiServiceBeforeSaveCreateContext<Entity extends BaseEntity> = BeforeSaveCreateContext<Entity>;
/** @deprecated Use `BeforeSaveCreateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveCreateManyContext<Entity extends BaseEntity> = BeforeSaveCreateManyContext<Entity>;
/** @deprecated Use `BeforeSaveUpdateContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveUpdateContext<Entity extends BaseEntity> = BeforeSaveUpdateContext<Entity>;
/** @deprecated Use `BeforeSaveUpdateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveUpdateManyContext<Entity extends BaseEntity> = BeforeSaveUpdateManyContext<Entity>;
/** @deprecated Use `BeforeSaveReplaceContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveReplaceContext<Entity extends BaseEntity> = BeforeSaveReplaceContext<Entity>;
/** @deprecated Use `BeforeSaveDeleteContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteContext = BeforeSaveDeleteContext;
/** @deprecated Use `BeforeSaveDeleteManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDeleteManyContext = BeforeSaveDeleteManyContext;
/** @deprecated Use `BeforeSaveDuplicateContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDuplicateContext<Entity extends BaseEntity> = BeforeSaveDuplicateContext<Entity>;
/** @deprecated Use `BeforeSaveDuplicateManyContext` instead. Will be removed in v5. */
type DynamicApiServiceBeforeSaveDuplicateManyContext<Entity extends BaseEntity> = BeforeSaveDuplicateManyContext<Entity>;
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
