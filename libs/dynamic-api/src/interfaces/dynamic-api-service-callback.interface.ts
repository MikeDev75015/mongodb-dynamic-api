import { Type } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { BaseEntity } from '../models';
import { DeleteResult, UpdateResult } from './dynamic-api-route-response.type';

type DynamicApiCallbackMethods = {
  findManyDocuments<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T[]>;
  findOneDocument<T>(entity: Type<T>, query: FilterQuery<T>): Promise<T | undefined>;
  createManyDocuments<T>(entity: Type<T>, data: Partial<T>[]): Promise<T[]>;
  createOneDocument<T>(entity: Type<T>, data: Partial<T>): Promise<T>;
  updateManyDocuments<T>(entity: Type<T>, query: FilterQuery<T>, data: Partial<T>): Promise<UpdateResult>;
  updateOneDocument<T>(entity: Type<T>, query: FilterQuery<T>, data: Partial<T>): Promise<UpdateResult>;
  deleteManyDocuments<T>(entity: Type<T>, ids: string[]): Promise<DeleteResult>;
  deleteOneDocument<T>(entity: Type<T>, id: string): Promise<DeleteResult>;
};

type DynamicApiServiceCallback<Entity extends BaseEntity> = (
  entity: Entity,
  methods: DynamicApiCallbackMethods,
) => Promise<void>;

type DynamicApiResetPasswordCallbackMethods<Entity extends BaseEntity, UpdateBy = 'userId'> = {
  findUserByEmail: (email: string) => Promise<Entity | undefined>;
  updateUserByEmail: (email: string, update: Partial<Entity>) => Promise<Entity | undefined>;
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
