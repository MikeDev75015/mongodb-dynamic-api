import { Type } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { FilterQuery, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { BaseEntity } from '../models';
import { DeleteResult, UpdateResult } from './dynamic-api-route-response.type';

type DynamicApiCallbackMethods = {
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
  deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult>;
  deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult>;
  aggregateDocuments<T>(entity: Type<T>, pipeline: PipelineStage[]): Promise<T[]>
};

type DynamicApiServiceCallback<Entity extends BaseEntity> = (
  entity: Entity,
  methods: DynamicApiCallbackMethods,
) => Promise<void>;

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
  DynamicApiServiceCallback,
  DynamicApiResetPasswordCallback,
  DynamicApiCallbackMethods,
  DynamicApiResetPasswordCallbackMethods,
};
