import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GetPagingResult, PipelineStage } from 'mongodb-pipeline-builder';
import { ClientSession, FilterQuery, Model, PipelineStage as MongoosePipelineStage, Schema, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { DERIVED_FIELD_KEYS_METADATA, DERIVED_FIELD_METADATA, DerivedFieldMeta } from '../../decorators';
import { isPagingPipeline } from '../../helpers/pipeline-paging.helper';
import { isTransactionsUnsupportedError } from '../../helpers/mongo-transaction.helper';
import { AbilityPredicate, AfterSaveCallback, AuditLogAction, AuthAbilityPredicate, CallbackMethods, CallbackRetryOptions, CascadeConfig, DeleteResult, MongoUpdateOperators, UpdateResult } from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger';
import { BaseEntity, SoftDeletableEntity } from '../../models';
import { DynamicApiResetPasswordOptions } from '../../modules';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export abstract class BaseService<Entity extends BaseEntity> {
  protected user: unknown;

  protected readonly entity: Type<Entity>;

  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;

  protected readonly passwordField: keyof Entity | undefined;

  protected readonly resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  protected readonly callbackMethods: CallbackMethods;

  private readonly baseServiceLogger = new MongoDBDynamicApiLogger(BaseService.name);

  protected constructor(protected readonly model: Model<Entity>) {
    this.callbackMethods = {
      findManyDocuments: this.findManyDocuments.bind(this),
      findOneDocument: this.findOneDocument.bind(this),
      createManyDocuments: this.createManyDocuments.bind(this),
      createOneDocument: this.createOneDocument.bind(this),
      updateManyDocuments: this.updateManyDocuments.bind(this),
      updateOneDocument: this.updateOneDocument.bind(this),
      rawUpdateManyDocuments: this.rawUpdateManyDocuments.bind(this),
      rawUpdateOneDocument: this.rawUpdateOneDocument.bind(this),
      deleteManyDocuments: this.deleteManyDocuments.bind(this),
      deleteOneDocument: this.deleteOneDocument.bind(this),
      aggregateDocuments: this.aggregateDocuments.bind(this),
      recomputeDerivedFields: this.recomputeDerivedFields.bind(this),
    };
  }

  get isSoftDeletable() {
    const paths = Object.getOwnPropertyNames(this.model.schema.paths);
    return paths.includes('deletedAt') && paths.includes('isDeleted');
  }

  protected verifyArguments(...args: unknown[]) {
    if (args.includes(undefined)) {
      throw new BadRequestException('Invalid or missing argument');
    }
  }

  protected async aggregateDocumentsWithAbilityPredicate(pipeline: PipelineStage[]) {
    this.baseServiceLogger.debug('aggregateDocumentsWithAbilityPredicate', {
      pipeline: JSON.stringify(pipeline),
      entityName: this.entity.name,
    });

    const documents = await this.aggregateDocuments(this.entity, pipeline);

    if (this.abilityPredicate) {
      documents.forEach((d) => this.handleAbilityPredicate(d));
    }

    return documents;
  }

  protected async findManyDocumentsWithAbilityPredicate(conditions: FilterQuery<Entity> = {}) {
    this.baseServiceLogger.debug('findManyDocumentsWithAbilityPredicate', {
      conditions: JSON.stringify(conditions),
      entityName: this.entity.name,
    });

    const documents = await this.findManyDocuments(this.entity, conditions);

    if (this.abilityPredicate) {
      documents.forEach((d) => this.handleAbilityPredicate(d));
    }

    return documents;
  }

  protected async findOneDocumentWithAbilityPredicate(
    _id: string | Schema.Types.ObjectId | undefined,
    conditions: FilterQuery<Entity> = {},
    authAbilityPredicate?: AuthAbilityPredicate<Entity>,
  ) {
    this.baseServiceLogger.debug('findOneDocumentWithAbilityPredicate', {
      _id,
      conditions: JSON.stringify(conditions),
      entityName: this.entity.name,
      authAbilityPredicate: !!authAbilityPredicate,
    });

    let document = await this.findOneDocument(this.entity, {
      ...(
        _id ? { _id } : {}
      ),
      ...conditions,
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    if (authAbilityPredicate || this.abilityPredicate) {
      this.handleAbilityPredicate(document, authAbilityPredicate);
    }

    return document;
  }

  /**
   * Runs `pipeline` and returns its documents, allowing for `id` normalization via
   * `addDocumentId`. A `.Paging()`-built pipeline (a `$facet` producing `{ docs, count }`, see
   * `isPagingPipeline`) is unwrapped via `GetPagingResult` first — its raw aggregate result has no
   * `_id` of its own (it's a summary object, not an entity), so `addDocumentId` would throw on it
   * otherwise. Used both by `CallbackMethods.aggregateDocuments` and by the ability-predicate
   * guard's own `aggregateDocumentsWithAbilityPredicate` (which, unlike `BaseAggregateService.aggregate`,
   * has no other paging-aware path of its own).
   */
  protected async aggregateDocuments<T extends BaseEntity>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    if (isPagingPipeline(pipeline)) {
      const pagingResult = await GetPagingResult<T>(model, pipeline);
      return pagingResult.GetDocs().map((d) => this.addDocumentId(d));
    }

    const documents = await model.aggregate(pipeline as MongoosePipelineStage[]).exec() as T[];

    return documents.map((d) => this.addDocumentId(d));
  }

  protected async findManyDocuments<T extends BaseEntity>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const documents = await model.find(query).lean<T[]>().exec();

    return documents.map((d) => this.addDocumentId(d));
  }

  protected async findOneDocument<T extends BaseEntity>(
    entity: Type<T>,
    query: FilterQuery<T>,
  ): Promise<T | undefined> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const document = await model.findOne(query).lean<T>().exec();

    return document ? this.addDocumentId(document) : undefined;
  }

  protected async createManyDocuments<T extends BaseEntity>(entity: Type<T>, data: Partial<T>[]): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const documents = await model.create(data) as T[];

    return documents.map((d) => this.addDocumentId(d));
  }

  protected async createOneDocument<T extends BaseEntity>(entity: Type<T>, data: Partial<T>): Promise<T> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const document = await model.create(data) as T;

    return this.addDocumentId(document);
  }

  protected async updateManyDocuments<T extends BaseEntity>(
    entity: Type<T>,
    query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.updateMany(query, update).exec();
  }

  protected async updateOneDocument<T extends BaseEntity>(
    entity: Type<T>, query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const targetId = await this.resolveDerivedFieldsTargetId(entity, model, query);

    const result = await model.updateOne(query, update).exec();

    if (targetId) {
      await this.recomputeDerivedFields(entity, targetId);
    }

    return result;
  }

  /**
   * Resolves the `_id` of the single document `query` will touch, but only when `entity` has at
   * least one `@DerivedField` declared — the extra `findOne` this costs is worth paying only when
   * there's actually something to recompute afterward. Used by `updateOneDocument` and
   * `rawUpdateOneDocument` to auto-recompute derived fields after a write that otherwise bypasses
   * the native pipeline that normally does this.
   */
  private async resolveDerivedFieldsTargetId<T extends BaseEntity>(
    entity: Type<T>,
    model: Model<T>,
    query: FilterQuery<T>,
  ): Promise<string | undefined> {
    const keys: (string | symbol)[] =
      Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, entity?.prototype) ?? [];

    if (!keys.length) {
      return undefined;
    }

    const target = await model.findOne(query, { _id: 1 }).lean<{ _id: unknown }>().exec();

    return target ? (target._id as { toString(): string }).toString() : undefined;
  }

  private validateMongoOperators<T extends BaseEntity>(update: MongoUpdateOperators<T>): void {
    const invalidKeys = Object.keys(update).filter((k) => !k.startsWith('$'));
    if (invalidKeys.length > 0) {
      throw new BadRequestException(
        `Invalid raw update: all keys must be MongoDB operators starting with "$". Invalid keys: ${invalidKeys.join(', ')}`,
      );
    }
  }

  protected async rawUpdateManyDocuments<T extends BaseEntity>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult> {
    this.validateMongoOperators(update);
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.updateMany(filter, update).exec();
  }

  protected async rawUpdateOneDocument<T extends BaseEntity>(
    entity: Type<T>,
    filter: FilterQuery<T>,
    update: MongoUpdateOperators<T>,
  ): Promise<UpdateResult> {
    this.validateMongoOperators(update);
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const targetId = await this.resolveDerivedFieldsTargetId(entity, model, filter);

    const result = await model.updateOne(filter, update).exec();

    if (targetId) {
      await this.recomputeDerivedFields(entity, targetId);
    }

    return result;
  }

  protected async deleteManyDocuments<T extends BaseEntity>(entity: Type<T>, ids: string[]): Promise<DeleteResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    if (this.isModelSoftDeletable(model)) {
      const result = await model.updateMany(
        { _id: { $in: ids } },
        { isDeleted: true, deletedAt: new Date() },
      ).exec();
      return { deletedCount: result.modifiedCount };
    }

    return model.deleteMany({ _id: { $in: ids } }).exec();
  }

  protected async deleteOneDocument<T extends BaseEntity>(entity: Type<T>, id: string): Promise<DeleteResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    if (this.isModelSoftDeletable(model)) {
      const result = await model.updateOne(
        { _id: id },
        { isDeleted: true, deletedAt: new Date() },
      ).exec();
      return { deletedCount: result.modifiedCount };
    }

    return model.deleteOne({ _id: id }).exec();
  }

  /**
   * Executes configured cascade deletes after a successful parent delete.
   * Each `CascadeConfig` entry whose `on` value matches the delete mode is processed.
   *
   * @param parentIds    - IDs of the deleted parent documents.
   * @param cascade      - cascade configurations from the route config.
   * @param isSoftDelete - `true` if the parent was soft-deleted, `false` if hard-deleted.
   * @param session      - active `ClientSession` to run these writes in, when called from
   *                       {@link deleteWithCascade}'s transactional path. Omitted otherwise.
   */
  protected async executeCascade(
    parentIds: string[],
    cascade: CascadeConfig[],
    isSoftDelete: boolean,
    session?: ClientSession,
  ): Promise<void> {
    for (const config of cascade) {
      if (!BaseService.shouldTriggerCascade(config, isSoftDelete)) {
        continue;
      }

      const useSoftDelete = config.softDelete ?? isSoftDelete;
      const model = await this.resolveCascadeModel(config, session);
      const filter = { [config.foreignKey]: { $in: parentIds } } as FilterQuery<BaseEntity>;

      await (useSoftDelete
        ? BaseService.softDeleteCascade(model, filter, session)
        : BaseService.hardDeleteCascade(model, filter, session));
    }
  }

  /** Whether a given cascade config should run for the delete mode (`hard` vs `soft`) in progress. */
  private static shouldTriggerCascade(config: CascadeConfig, isSoftDelete: boolean): boolean {
    return (config.on === 'delete' && !isSoftDelete) || (config.on === 'softDelete' && isSoftDelete);
  }

  /**
   * A session is only ever bound to the connection it was started on (this.model.db) — a model
   * resolved via DynamicApiGlobalStateService.getEntityModel lives on its own, separate connection
   * and would make MongoDB reject the write outright ("session was started on a different
   * client"). Cascade children are always registered on the same connection as the parent
   * (forFeature always uses the shared connectionName), so this.model.db.model(...) resolves the
   * exact same, already-compiled model.
   */
  private async resolveCascadeModel(config: CascadeConfig, session?: ClientSession): Promise<Model<BaseEntity>> {
    return session
      ? this.model.db.model<BaseEntity>(config.entity.name)
      : DynamicApiGlobalStateService.getEntityModel(config.entity);
  }

  /** Marks every document matching `filter` as deleted, inside `session` when provided. */
  private static async softDeleteCascade(
    model: Model<BaseEntity>,
    filter: FilterQuery<BaseEntity>,
    session?: ClientSession,
  ): Promise<void> {
    const update = { $set: { isDeleted: true, deletedAt: new Date() } };
    await (session ? model.updateMany(filter, update, { session }) : model.updateMany(filter, update)).exec();
  }

  /** Hard-deletes every document matching `filter`, inside `session` when provided. */
  private static async hardDeleteCascade(
    model: Model<BaseEntity>,
    filter: FilterQuery<BaseEntity>,
    session?: ClientSession,
  ): Promise<void> {
    await (session ? model.deleteMany(filter, { session }) : model.deleteMany(filter)).exec();
  }

  /**
   * Runs `deleteParent` and, when `cascade` has at least one entry, the matching cascade deletes
   * as **one atomic MongoDB transaction** — provided the connection supports it (a replica set or
   * mongos; standalone `mongod` instances don't support multi-document transactions at all).
   *
   * On a standalone instance, the transaction attempt fails immediately with a well-known error
   * (see {@link isTransactionsUnsupportedError}); this method catches exactly that case, logs a
   * warning once, and falls back to running `deleteParent` alone — the caller is then responsible
   * for invoking {@link executeCascade} itself, **outside** any try/catch that would zero out an
   * already-successful parent delete count (see `DeleteOne`/`DeleteMany`'s `deleteOne`/`deleteMany`
   * for the exact pattern). Any other error propagates unchanged.
   *
   * @param deleteParent - performs the parent delete/soft-delete; receives the active `ClientSession`
   *   when running inside a transaction (`undefined` on the non-transactional fallback), and must
   *   return the number of parent documents affected.
   * @param parentIds    - IDs of the parent documents being deleted — forwarded to `executeCascade`.
   * @param isSoftDelete - `true` if the parent is being soft-deleted, `false` if hard-deleted.
   * @param cascade      - cascade configurations from the route config, if any.
   */
  protected async deleteWithCascade(
    deleteParent: (session?: ClientSession) => Promise<number>,
    parentIds: string[],
    isSoftDelete: boolean,
    cascade: CascadeConfig[] | undefined,
  ): Promise<{ deletedCount: number; cascadeCompleted: boolean }> {
    if (!cascade?.length) {
      return { deletedCount: await deleteParent(), cascadeCompleted: true };
    }

    try {
      const deletedCount = await this.runInTransaction(async (session) => {
        const count = await deleteParent(session);
        await this.executeCascade(parentIds, cascade, isSoftDelete, session);
        return count;
      });

      return { deletedCount, cascadeCompleted: true };
    } catch (error) {
      if (!isTransactionsUnsupportedError(error)) {
        throw error;
      }

      this.baseServiceLogger.warn(
        '[Cascade] MongoDB transactions are not supported on this connection (not a replica set '
        + 'or mongos) — falling back to sequential, non-atomic cascade deletes. See the Cascade '
        + 'Delete docs for details.',
      );

      return { deletedCount: await deleteParent(), cascadeCompleted: false };
    }
  }

  /** Runs `work` inside a MongoDB session transaction, always ending the session afterward. */
  private async runInTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.model.db.startSession();

    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Records a single mutation to the entity's own `<collection>_audit_log` collection, when
   * `auditLog: true` is set on the route config. Schema-less (writes through the native driver,
   * not a compiled Mongoose model) — the audit shape is generic across every entity.
   *
   * Best-effort: a write failure is logged and swallowed, never thrown — an audit trail issue
   * must not fail the mutation it's trying to record.
   */
  protected async writeAuditLog(
    action: AuditLogAction,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    user: unknown,
  ): Promise<void> {
    try {
      const collectionName = `${this.model.collection.collectionName}_audit_log`;
      await this.model.db.collection(collectionName).insertOne({
        action,
        entityId,
        before,
        after,
        user,
        timestamp: new Date(),
      });
    } catch (error) {
      this.baseServiceLogger.warn(
        `[AuditLog] Failed to write audit entry (${action}) for ${this.entity?.name ?? 'entity'} `
        + `${entityId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected buildInstance(document: Entity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      _id,
      id,
      __v,
      isDeleted,
      deletedAt,
      ...rest
    } = document as unknown as SoftDeletableEntity;

    const instance = plainToInstance(this.entity, {
      ...rest as Partial<Entity>,
      ...(
        _id && !id ? { id: _id?.toString() } : {}
      ),
      ...(id ? { id } : {}),
      ...(
        isDeleted ? { deletedAt } : {}
      ),
    });

    return this.applyDerivedFields(instance, 'read') as Entity;
  }

  /**
   * Applies `@DerivedField` computed values to a partial entity snapshot.
   * Only fields whose `on` option matches `trigger` (or is `'both'`) are computed.
   *
   * When `existingDoc` is supplied (update/replace scenarios), `computeFn` receives
   * the full merged document `{ ...existingDoc, ...partial }` as snapshot so that
   * fields not present in the partial (e.g. firstName during a lastName-only PATCH)
   * are still available for derivation.
   * The computed values are written back into the **returned partial only** (not the
   * full doc), preserving the semantics of a partial $set update.
   */
  protected applyDerivedFields(
    partial: Partial<Entity>,
    trigger: 'save' | 'read',
    existingDoc?: Partial<Entity>,
  ): Partial<Entity> {
    if (!this.entity?.prototype) {
      return partial;
    }

    const keys: (string | symbol)[] =
      Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, this.entity.prototype) ?? [];

    if (!keys.length) {
      return partial;
    }

    const snapshot = existingDoc ? { ...existingDoc, ...partial } : { ...partial };

    return { ...partial, ...BaseService.computeDerivedFieldsFor(this.entity, snapshot, trigger) };
  }

  /**
   * Computes every `@DerivedField` value declared on `entityClass` whose `on` option matches
   * `trigger` (or is `'both'`), from `snapshot`. Shared by {@link applyDerivedFields} (bound to
   * the service's own `this.entity`) and {@link recomputeDerivedFields} (works against an
   * arbitrary entity, matching the rest of `CallbackMethods`). Both callers already guard against
   * a missing `entityClass`/`prototype` before calling this, so it's not re-checked here.
   */
  private static computeDerivedFieldsFor<T>(
    entityClass: Type<T>,
    snapshot: Partial<T>,
    trigger: 'save' | 'read',
  ): Partial<T> {
    const keys: (string | symbol)[] =
      Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, entityClass.prototype) ?? [];

    const result: Partial<T> = {};

    for (const key of keys) {
      const meta = Reflect.getMetadata(
        DERIVED_FIELD_METADATA,
        entityClass.prototype,
        key,
      ) as DerivedFieldMeta<T> | undefined;

      if (meta && (meta.on === trigger || meta.on === 'both')) {
        result[key as keyof T] = meta.computeFn(snapshot) as T[keyof T];
      }
    }

    return result;
  }

  /**
   * Recomputes and persists every `@DerivedField({ on: 'save' })` (or `'both'`) value for a
   * single document, from its **current, full** state in the database.
   *
   * The native `CreateOne`/`UpdateOne`/`ReplaceOne`/... pipelines already do this automatically.
   * Call this yourself after writing to an entity through any of `CallbackMethods`'
   * `updateOneDocument`/`rawUpdateOneDocument` — which do this for you already, see below — or,
   * for the many-document variants (`updateManyDocuments`/`rawUpdateManyDocuments`), which don't
   * auto-recompute (a derived field on N documents isn't cheap to recompute unconditionally),
   * once per touched document.
   *
   * A no-op (never throws) when `entity` has no `@DerivedField` declared, when `id` doesn't
   * resolve to a document, or if recomputation itself fails — this always runs as a side effect
   * after a write already succeeded, and must never turn that into a failed request.
   */
  protected async recomputeDerivedFields<T extends BaseEntity>(entity: Type<T>, id: string): Promise<void> {
    const keys: (string | symbol)[] =
      Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, entity?.prototype) ?? [];

    if (!keys.length) {
      return;
    }

    try {
      const model = await DynamicApiGlobalStateService.getEntityModel(entity);
      const document = await model.findById(id).lean<T>().exec();

      if (!document) {
        return;
      }

      const recomputed = BaseService.computeDerivedFieldsFor(entity, document as Partial<T>, 'save');

      if (Object.keys(recomputed).length === 0) {
        return;
      }

      await model.updateOne({ _id: id }, { $set: recomputed }).exec();
    } catch (error) {
      this.baseServiceLogger.warn(
        `[DerivedFields] Failed to recompute derived fields for ${entity?.name ?? 'entity'} ${id}: `
        + `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  protected handleAbilityPredicate(document: Entity, authAbilityPredicate?: AuthAbilityPredicate<Entity>) {
    this.baseServiceLogger.debug('handleAbilityPredicate', {
      documentId: document?._id?.toString(),
      entityName: this.entity.name,
      abilityPredicate: !!this.abilityPredicate,
      authAbilityPredicate: !!authAbilityPredicate,
    });

    const isAllowed = authAbilityPredicate
      ? authAbilityPredicate(this.buildInstance(document))
      : this.abilityPredicate(document, this.user);

    if (!isAllowed) {
      throw new ForbiddenException('Forbidden resource');
    }
  }

  /**
   * Invokes `callback` (the after-save hook) with failure isolation: any error it throws —
   * even after exhausting `retry` — is caught, logged, and forwarded to the global
   * `onAfterSaveError` hook if configured. It never rejects, so a broken `callback` can never
   * corrupt the response of an already-successful primary operation.
   */
  protected async invokeAfterSaveCallback(
    callback: AfterSaveCallback<Entity> | undefined,
    entity: Entity,
    user: unknown,
    retry?: CallbackRetryOptions,
  ): Promise<void> {
    if (!callback) {
      return;
    }

    const attempts = Math.max(1, retry?.attempts ?? 1);
    const delayMs = retry?.delayMs ?? 0;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await callback(entity, this.callbackMethods, user);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts && delayMs > 0) {
          await this.sleep(delayMs);
        }
      }
    }

    this.baseServiceLogger.error(
      `[AfterSaveCallback] Failed for ${this.entity?.name ?? 'entity'} after ${attempts} attempt(s): `
      + `${(lastError as Error)?.message}`,
      (lastError as Error)?.stack,
    );

    try {
      // Lazy-require to avoid circular dependency at module load time (same pattern as
      // helpers/socket-config.helper.ts).
      const { DynamicApiModule } = require('../../dynamic-api.module');
      await DynamicApiModule.state.get('onAfterSaveError')?.(
        lastError,
        { entityName: this.entity?.name, entity, user },
      );
    } catch (hookError) {
      this.baseServiceLogger.error(
        `[onAfterSaveError] Global hook itself threw: ${(hookError as Error)?.message}`,
        (hookError as Error)?.stack,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected handleDuplicateKeyError(error: unknown, reThrow = true) {
    const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
    if (mongoError.code === 11000) {
      const properties = Object.entries(mongoError.keyValue ?? {})
      .filter(([key]) => key !== 'deletedAt')
      .map(([key, value]) => `${key} '${value}'`);

      throw new ConflictException(
        properties.length === 1
          ? `${properties[0]} is already used`
          : `The combination of ${properties.join(', ')} already exists`,
      );
    }

    this.rethrowOrWrapError(error, reThrow);
  }

  protected handleMongoErrors(error: unknown, reThrow = true) {
    const mongoError = error as { name?: string; errors?: Record<string, { properties: { message: string } }> };
    if (mongoError.name === 'CastError') {
      throw new NotFoundException(`${this.entity?.name ?? 'Document'} not found`);
    }

    if (mongoError.name === 'ValidationError') {
      const errorDetails = Object.values(mongoError.errors ?? {})?.map(({ properties }) => properties.message);
      throw new BadRequestException(errorDetails?.length ? errorDetails : ['Invalid payload']);
    }

    this.rethrowOrWrapError(error, reThrow);
  }

  protected handleDocumentNotFound() {
    throw new NotFoundException('Document not found');
  }

  protected addDocumentId<T extends BaseEntity>(document: T): T {
    return { ...document, id: document._id.toString() };
  }

  private isModelSoftDeletable<T>(model: Model<T>): boolean {
    const paths = Object.getOwnPropertyNames(model.schema.paths);
    return paths.includes('deletedAt') && paths.includes('isDeleted');
  }

  private rethrowOrWrapError(error: unknown, reThrow: boolean): void {
    if (!reThrow) {
      return;
    }

    if (error instanceof HttpException) {
      throw error;
    }

    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      const errRecord = error as Record<string, unknown>;
      errorMessage = typeof errRecord.message === 'string' ? errRecord.message : JSON.stringify(error);
    }
    throw new ServiceUnavailableException(errorMessage);
  }
}
