import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createMock } from '@test-helpers';
import { PipelineBuilder } from 'mongodb-pipeline-builder';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';
import { DynamicApiGlobalStateService } from '../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { DynamicApiRepository, RepositoryHelper } from './repository.helper';

describe('RepositoryHelper', () => {
  class TestEntity extends BaseEntity {
    name: string;

    version: number;
  }

  let model: Model<TestEntity>;
  let repository: DynamicApiRepository<TestEntity>;
  let dynamicApiGlobalStateServiceGetEntityModelSpy: Mock;

  beforeEach(async () => {
    model = createMock<Model<TestEntity>>();
    dynamicApiGlobalStateServiceGetEntityModelSpy =
      // @ts-ignore
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
    repository = await RepositoryHelper.getRepository(TestEntity);
  });

  describe('getRepository', () => {
    it('should return a repository with the provided model', async () => {
      expect(repository).toEqual({
        aggregate: expect.any(Function),
        bulkCreate: expect.any(Function),
        create: expect.any(Function),
        delete: expect.any(Function),
        find: expect.any(Function),
        findAll: expect.any(Function),
        paginate: expect.any(Function),
        update: expect.any(Function),
      });
      expect(dynamicApiGlobalStateServiceGetEntityModelSpy).toHaveBeenCalledWith(TestEntity);
    });
  });

  describe('repository methods', () => {
    const addFakeObjectId = (entity: any) => (
      { ...entity, _id: 'fake-object-id' }
    );
    const addToObject = (entity: any) => (
      { ...entity, _id: 'fake-object-id', toObject: () => entity }
    );

    describe('aggregate', () => {
      it('should call aggregate with the provided pipeline', async () => {
        const pipeline = [{ $match: { name: 'test' } }];
        await repository.aggregate(pipeline);

        expect(model.aggregate).toHaveBeenCalledWith(pipeline);
      });
    });

    describe('bulkCreate', () => {
      it('should call create with the provided list of entities', async () => {
        const entities = [addToObject({ name: 'test' }), addToObject({ name: 'test2' })];
        model.create = vi.fn().mockResolvedValue(entities);
        await repository.bulkCreate(entities);

        expect(model.create).toHaveBeenCalledWith(entities);
      });
    });

    describe('create', () => {
      it('should call create with the provided entity', async () => {
        const entity = addToObject({ name: 'test' });
        model.create = vi.fn().mockResolvedValue(entity);
        await repository.create(entity);

        expect(model.create).toHaveBeenCalledWith(entity);
      });
    });

    describe('delete', () => {
      it('should call delete with the id query', async () => {
        const query = { id: 'test' };
        model.deleteOne = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 1 }) });
        await repository.delete(query);

        expect(model.deleteOne).toHaveBeenCalledWith({ _id: query.id });
      });

      it('should call delete with the idList query', async () => {
        const query = { idList: ['test', 'test2'] };
        model.deleteMany = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 2 }) });
        await repository.delete(query);

        expect(model.deleteMany).toHaveBeenCalledWith({ _id: { $in: query.idList } });
      });

      it('should return false if no query is provided', async () => {
        const result = await repository.delete({});

        expect(result).toBe(false);
      });
    });

    describe('find', () => {
      it('should call find with the provided query', async () => {
        const query = { name: 'test' };
        model.findOne = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(addFakeObjectId({ name: 'test' })),
          }),
        });
        await repository.find(query);

        expect(model.findOne).toHaveBeenCalledWith(query);
      });

      it('should return null if no entity is found', async () => {
        model.findOne = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        });
        const result = await repository.find({});

        expect(result).toBeNull();
      });
    });

    describe('findAll', () => {
      it('should call find with the provided query', async () => {
        const query = { name: 'test' };
        model.find = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([addFakeObjectId({ name: 'test' })]),
          }),
        });
        await repository.findAll(query);

        expect(model.find).toHaveBeenCalledWith(query);
      });

      it('should call find with an empty query', async () => {
        model.find = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([addFakeObjectId({ name: 'test' })]),
          }),
        });
        await repository.findAll();

        expect(model.find).toHaveBeenCalledWith({});
      });
    });

    describe('paginate', () => {
      it('should call paginate with the provided pipeline', async () => {
        const pipeline = new PipelineBuilder('test').Match({ name: 'test' }).Paging(5, 2).build();
        model.aggregate = vi.fn().mockResolvedValue([{ docs: [{ name: 'test' }], count: [{ totalElements: 21 }] }]);
        await repository.paginate(pipeline);

        expect(model.aggregate).toHaveBeenCalledWith(pipeline);
      });
    });

    describe('update', () => {
      it('should call findOneAndUpdate with the provided query and update', async () => {
        const query = { _id: 'test' };
        const toUpdate = { name: 'test2' };
        model.findOneAndUpdate = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(addFakeObjectId({ name: 'test2' })),
          }),
        });
        await repository.update(query, toUpdate);

        expect(model.findOneAndUpdate).toHaveBeenCalledWith(query, { $set: toUpdate }, { new: true });
      });

      it('should return null if no entity is found', async () => {
        model.findOneAndUpdate = vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        });
        const result = await repository.update({}, {});

        expect(result).toBeNull();
      });
    });
  });
});
