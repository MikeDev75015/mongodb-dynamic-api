import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { FilterQuery, Model, PipelineStage as MongoosePipelineStage, Schema, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { AbilityPredicate, AuthAbilityPredicate, DeleteResult, DynamicApiCallbackMethods, UpdateResult } from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger';
import { BaseEntity, SoftDeletableEntity } from '../../models';
import { DynamicApiResetPasswordOptions } from '../../modules';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';

export abstract class BaseService<Entity extends BaseEntity> {
  protected user: unknown;

  protected readonly entity: Type<Entity>;

  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;

  protected readonly passwordField: keyof Entity | undefined;

  protected readonly resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  protected readonly callbackMethods: DynamicApiCallbackMethods;

  private readonly baseServiceLogger = new MongoDBDynamicApiLogger(BaseService.name);

  protected constructor(protected readonly model: Model<Entity>) {
    this.callbackMethods = {
      findManyDocuments: this.findManyDocuments.bind(this),
      findOneDocument: this.findOneDocument.bind(this),
      createManyDocuments: this.createManyDocuments.bind(this),
      createOneDocument: this.createOneDocument.bind(this),
      updateManyDocuments: this.updateManyDocuments.bind(this),
      updateOneDocument: this.updateOneDocument.bind(this),
      deleteManyDocuments: this.deleteManyDocuments.bind(this),
      deleteOneDocument: this.deleteOneDocument.bind(this),
      aggregateDocuments: this.aggregateDocuments.bind(this),
    };
  }

  get isSoftDeletable() {
    const paths = Object.getOwnPropertyNames(this.model.schema.paths);
    return paths.includes('deletedAt') && paths.includes('isDeleted');
  }

  protected verifyArguments(...args: unknown[]) {
    if (args.some((arg) => arg === undefined)) {
      throw new BadRequestException('Invalid or missing argument');
    }
  }

  protected async aggregateDocumentsWithAbilityPredicate(pipeline: any[]) {
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

  protected async aggregateDocuments<T extends BaseEntity>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const documents = await model.aggregate(pipeline as MongoosePipelineStage[]).exec() as T[];

    return documents.map((d) => this.addDocumentId(d));
  }

  protected async findManyDocuments<T extends BaseEntity>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const documents = await model.find(query).lean().exec() as T[];

    return documents.map((d) => this.addDocumentId(d));
  }

  protected async findOneDocument<T extends BaseEntity>(
    entity: Type<T>,
    query: FilterQuery<T>,
  ): Promise<T | undefined> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    const document = await model.findOne(query).lean().exec() as T | undefined;

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
    return model.updateOne(query, update).exec();
  }

  protected async deleteManyDocuments<T extends BaseEntity>(entity: Type<T>, ids: string[]): Promise<DeleteResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    const paths = Object.getOwnPropertyNames(model.schema.paths);
    const isSoftDeletable = paths.includes('deletedAt') && paths.includes('isDeleted');

    if (isSoftDeletable) {
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

    const paths = Object.getOwnPropertyNames(model.schema.paths);
    const isSoftDeletable = paths.includes('deletedAt') && paths.includes('isDeleted');

    if (isSoftDeletable) {
      const result = await model.updateOne(
        { _id: id },
        { isDeleted: true, deletedAt: new Date() },
      ).exec();
      return { deletedCount: result.modifiedCount };
    }

    return model.deleteOne({ _id: id }).exec();
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

    return plainToInstance(this.entity, {
      ...rest as Partial<Entity>,
      ...(
        _id && !id ? { id: _id?.toString() } : {}
      ),
      ...(id ? { id } : {}),
      ...(
        isDeleted ? { deletedAt } : {}
      ),
    });
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

  protected handleDuplicateKeyError(error: any, reThrow = true) {
    if (error.code === 11000) {
      const properties = Object.entries(error.keyValue)
      .filter(([key]) => key !== 'deletedAt')
      .map(([key, value]) => `${key} '${value}'`);

      throw new ConflictException(
        properties.length === 1
          ? `${properties[0]} is already used`
          : `The combination of ${properties.join(', ')} already exists`,
      );
    }

    if (!reThrow) {
      return;
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException(error.message);
  }

  protected handleMongoErrors(error: any, reThrow = true) {
    if (error.name === 'CastError') {
      throw new NotFoundException(`${this.entity?.name ?? 'Document'} not found`);
    }

    if (error.name === 'ValidationError') {
      const errorDetails = Object.values(error.errors)?.map(({ properties }) => properties.message as string);
      throw new BadRequestException(errorDetails?.length ? errorDetails : ['Invalid payload']);
    }

    if (!reThrow) {
      return;
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException(error.message);
  }

  protected handleDocumentNotFound() {
    throw new NotFoundException('Document not found');
  }

  protected addDocumentId<T extends BaseEntity>(document: T): T {
    return { ...document, id: document._id.toString() } as T;
  }
}
