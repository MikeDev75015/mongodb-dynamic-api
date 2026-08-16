import { Type } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { FilterQuery, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { BaseEntity } from '../models';
import { DeleteResult, UpdateResult } from './dynamic-api-route-response.type';

/**
 * Explicit MongoDB update-operator payload.
 * All keys must begin with `$` — replacement-style documents are rejected.
 */
type MongoUpdateOperators<T> = {
  $set?: Partial<T>;
  $unset?: Partial<Record<keyof T, '' | 1 | true>>;
  $push?: Partial<{
    [K in keyof T]: T[K] extends Array<infer U>
      ? U | { $each: U[]; $position?: number; $slice?: number; $sort?: Record<string, 1 | -1> }
      : never;
  }>;
  $pull?: Partial<{
    [K in keyof T]: T[K] extends Array<infer U>
      ? Partial<U> | FilterQuery<U>
      : never;
  }>;
  $inc?: Partial<Record<keyof T, number>>;
  $addToSet?: Partial<{
    [K in keyof T]: T[K] extends Array<infer U>
      ? U | { $each: U[] }
      : never;
  }>;
  $pop?: Partial<Record<keyof T, -1 | 1>>;
  $rename?: Partial<Record<keyof T, string>>;
};

type CallbackMethods = {
  findManyDocuments<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]>;
  findOneDocument<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T | undefined>;
  createManyDocuments<T>(entity: Type<T>, data: Partial<T>[]): Promise<T[]>;
  createOneDocument<T>(entity: Type<T>, data: Partial<T>): Promise<T>;
  updateManyDocuments<T>(
    entity: Type<T>, query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult>;
  updateOneDocument<T>(
    entity: Type<T>, query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult>;
  rawUpdateManyDocuments<T>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult>;
  rawUpdateOneDocument<T>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult>;
  deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult>;
  deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult>;
  aggregateDocuments<T>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]>
};

/** @deprecated Use `CallbackMethods` instead. Will be removed in v5. */
type DynamicApiCallbackMethods = CallbackMethods;

type AfterSaveCallback<Entity extends BaseEntity, User = unknown> = (
  entity: Entity,
  methods: CallbackMethods,
  user?: User,
) => Promise<void>;

/** @deprecated Use `AfterSaveCallback` instead. Will be removed in v5. */
type DynamicApiServiceCallback<Entity extends BaseEntity, User = unknown> = AfterSaveCallback<Entity, User>;

/**
 * Retry options for `callback` (the after-save hook).
 * Only applies to `callback` — `beforeSaveCallback`/`beforeDeleteCallback` keep their
 * existing fail-fast/abort behavior and are never retried.
 */
type CallbackRetryOptions = {
  /** Total number of attempts, including the first one. @default 1 (no retry) */
  attempts?: number;
  /** Fixed delay in milliseconds between attempts. @default 0 (no delay) */
  delayMs?: number;
};

/**
 * Bundles `callback` (the after-save hook) with its retry policy, and `auditLog` (also written
 * after a successful save) — passed as a single object to each route's internal
 * `createXServiceProvider` factory so they stay together instead of traveling as separate
 * positional parameters.
 *
 * @internal Not part of the public API — will be removed from the package's public exports in v5.
 */
type AfterSaveCallbackConfig<Entity extends BaseEntity, User = unknown> = {
  callback: AfterSaveCallback<Entity, User> | undefined;
  retry?: CallbackRetryOptions;
  auditLog?: boolean;
};

/**
 * Global hook invoked when `callback` (the after-save hook) has exhausted all configured
 * retry attempts (or failed once, when no retry is configured) and its error was swallowed
 * to protect the primary operation's response. Configured once via `DynamicApiModule.forRoot`.
 *
 * If this hook itself throws, the error is caught and logged — it can never affect the
 * response either.
 *
 * @example
 * ```typescript
 * DynamicApiModule.forRoot(uri, {
 *   onAfterSaveError: (error, { entityName, entity, user }) => {
 *     console.error(`[audit] afterSaveCallback failed for ${entityName}`, error);
 *   },
 * });
 * ```
 */
type OnAfterSaveErrorHook = (
  error: unknown,
  context: { entityName: string | undefined; entity: unknown; user: unknown },
) => void | Promise<void>;

type DynamicApiResetPasswordCallbackMethods<Entity extends BaseEntity, UpdateBy = 'userId'> = {
  findUserByEmail: () => Promise<Entity>;
  updateUserByEmail: (
    update: UpdateQuery<Entity> | UpdateWithAggregationPipeline,
  ) => Promise<Entity>;
};

type DynamicApiResetPasswordCallback<Entity extends BaseEntity> = (
  _: { resetPasswordToken: string; email: string },
  methods: DynamicApiResetPasswordCallbackMethods<Entity>,
) => Promise<void>;

export type {
  AfterSaveCallback,
  DynamicApiServiceCallback,
  DynamicApiResetPasswordCallback,
  DynamicApiCallbackMethods,
  DynamicApiResetPasswordCallbackMethods,
  CallbackMethods,
  CallbackRetryOptions,
  AfterSaveCallbackConfig,
  OnAfterSaveErrorHook,
  MongoUpdateOperators,
};
