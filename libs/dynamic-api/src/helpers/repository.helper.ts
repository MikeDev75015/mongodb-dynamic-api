import { Type } from '@nestjs/common';
import {
  GetPagingResult,
  GetPagingResultResponse,
  GetResult,
  GetResultResponse,
  PipelineStage,
} from 'mongodb-pipeline-builder';
import { FilterQuery, Model, QueryOptions } from 'mongoose';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services';

type DynamicApiRepository<Entity extends BaseEntity> = {
  aggregate(pipeline: PipelineStage[]): Promise<GetResultResponse<Entity>>
  bulkCreate(toCreateList: Partial<Entity>[]): Promise<Entity[]>;
  create(toCreate: Partial<Entity>): Promise<Entity>;
  delete(query: { id?: string; idList?: string[] }): Promise<boolean>;
  find(query: FilterQuery<Entity>): Promise<Entity | null>;
  findAll(query?: FilterQuery<Entity>): Promise<Entity[]>;
  paginate(pipeline: PipelineStage[]): Promise<GetPagingResultResponse<Entity>>;
  update(
    query: FilterQuery<Entity>,
    toUpdate: Partial<Entity>,
    options?: QueryOptions<Entity>,
  ): Promise<Entity | null>;
};

class RepositoryHelper {
  public static async getRepository<Entity extends BaseEntity>(entity: Type<Entity>): Promise<DynamicApiRepository<Entity>> {
    const model = await DynamicApiGlobalStateService.getEntityModel(entity);

    return {
      aggregate: (pipeline: PipelineStage[]) => RepositoryHelper.aggregate<Entity>(model, pipeline),
      bulkCreate: (toCreateList: Partial<Entity>[]) => RepositoryHelper.bulkCreate<Entity>(model, toCreateList),
      create: (toCreate: Entity) => RepositoryHelper.create<Entity>(model, toCreate),
      delete: (query: { id?: string; idList?: string[] }) => RepositoryHelper.delete<Entity>(model, query),
      find: (query: FilterQuery<Entity>) => RepositoryHelper.find<Entity>(model, query),
      findAll: (query?: FilterQuery<Entity>) => RepositoryHelper.findAll<Entity>(model, query),
      paginate: (pipeline: PipelineStage[]) => RepositoryHelper.paginate<Entity>(model, pipeline),
      update: (
        query: FilterQuery<Entity>,
        toUpdate: Partial<Entity>,
        options?: QueryOptions<Entity>,
      ) => RepositoryHelper.update<Entity>(model, query, toUpdate, options),
    };
  }

  private static aggregate<T extends BaseEntity>(model: Model<T>, pipeline: PipelineStage[]): Promise<GetResultResponse<T>> {
    return GetResult<T>(model, pipeline);
  }

  private static paginate<T extends BaseEntity>(model: Model<T>, pipeline: PipelineStage[]): Promise<GetPagingResultResponse<T>> {
    return GetPagingResult<T>(model, pipeline);
  }

  private static async findAll<T extends BaseEntity>(model: Model<T>,
    query: FilterQuery<T> = {},
  ): Promise<T[]> {
    const entities = await model.find(query).lean().exec();

    return entities.map(entity => ({ ...entity, id: entity._id.toString() })) as T[];
  }

  private static async find<T extends BaseEntity>(model: Model<T>, query: FilterQuery<T>): Promise<T | null> {
    const entity = await model.findOne(query).lean().exec();
    if (!entity) {
      return null;
    }

    return { ...entity, id: entity._id.toString() } as T;
  }

  private static async create<T extends BaseEntity>(model: Model<T>, toCreate: Partial<T>): Promise<T> {
    const entity = await model.create(toCreate);

    return { ...entity.toObject(), id: entity._id.toString() } as T;
  }

  private static async update<T extends BaseEntity>(
    model: Model<T>,
    query: FilterQuery<T>,
    toUpdate: Partial<T>,
    options: QueryOptions<T> = {},
  ): Promise<T | null> {
    const entity = await model
    .findOneAndUpdate(
      query,
      { $set: toUpdate },
      { ...options, new: true },
    )
    .lean()
    .exec();

    if (!entity) {
      return null;
    }

    return { ...entity, id: entity._id.toString() } as T;
  }

  private static async delete<T extends BaseEntity>(model: Model<T>, query: {
    id?: string;
    idList?: string[];
  }): Promise<boolean> {
    if (query.id) {
      const { deletedCount } = await model.deleteOne({ _id: query.id }).exec();
      return deletedCount === 1;
    } else if (query.idList) {
      const { deletedCount } = await model.deleteMany({ _id: { $in: query.idList } }).exec();
      return deletedCount === query.idList.length;
    } else {
      return false;
    }
  }

  private static async bulkCreate<T extends BaseEntity>(model: Model<T>, toCreate: Partial<T>[]): Promise<T[]> {
    const entities = await model.create(toCreate);

    return entities.map(entity => ({ ...entity.toObject(), id: entity._id.toString() })) as T[];
  }
}

export { RepositoryHelper, DynamicApiRepository };
