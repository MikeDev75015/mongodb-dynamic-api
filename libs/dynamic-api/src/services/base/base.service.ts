import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  Type,
} from '@nestjs/common';
import { Builder } from 'builder-pattern';
import { FilterQuery, Model, Schema, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import {
  AbilityPredicate,
  AuthAbilityPredicate,
  DeleteResult,
  DynamicApiCallbackMethods,
  UpdateResult,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiResetPasswordOptions } from '../../modules';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';

export abstract class BaseService<Entity extends BaseEntity> {
  protected user: unknown;

  protected readonly entity: Type<Entity>;

  protected readonly abilityPredicate: AbilityPredicate<Entity> | undefined;

  protected readonly passwordField: keyof Entity | undefined;

  protected readonly resetPasswordOptions: DynamicApiResetPasswordOptions<Entity> | undefined;

  protected readonly callbackMethods: DynamicApiCallbackMethods;

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
    };
  }

  get isSoftDeletable() {
    const paths = Object.getOwnPropertyNames(this.model.schema.paths);
    return paths.includes('deletedAt') && paths.includes('isDeleted');
  }

  protected async findManyDocumentsWithAbilityPredicate(conditions: FilterQuery<Entity> = {}) {
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
    const document = await this.findOneDocument(this.entity, {
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

  protected async findManyDocuments<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    // noinspection ES6MissingAwait
    return model.find(query).lean().exec() as Promise<T[]>;
  }

  protected async findOneDocument<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T | undefined> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    // noinspection ES6MissingAwait
    return model.findOne(query).lean().exec() as Promise<T | undefined>;
  }

  protected async createManyDocuments<T>(entity: Type<T>, data: Partial<T>[]): Promise<T[]> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.create(data) as Promise<T[]>;
  }

  protected async createOneDocument<T>(entity: Type<T>, data: Partial<T>): Promise<T> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.create(data) as Promise<T>;
  }

  protected async updateManyDocuments<T>(
    entity: Type<T>,
    query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.updateMany(query, update).exec();
  }

  protected async updateOneDocument<T>(
    entity: Type<T>, query: FilterQuery<T>,
    update: UpdateQuery<T> | UpdateWithAggregationPipeline,
  ): Promise<UpdateResult> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);
    return model.updateOne(query, update).exec();
  }

  protected async deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult> {
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

  protected async deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult> {
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
    const { _id, id, __v, ...rest } = document;

    return Builder(this.entity, rest as Partial<Entity>)
      .id(_id?.toString() ?? id)
      .build();
  }

  protected handleAbilityPredicate(document: Entity, authAbilityPredicate?: AuthAbilityPredicate<Entity>) {
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

    throw new ServiceUnavailableException(error.message);
  }

  protected handleDocumentNotFound() {
    throw new NotFoundException('Document not found');
  }
}
