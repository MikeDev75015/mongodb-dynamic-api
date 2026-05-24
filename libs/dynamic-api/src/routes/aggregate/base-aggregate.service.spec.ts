import { Type } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model, ObjectId } from 'mongoose';
import { AfterSaveCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseAggregateService } from './base-aggregate.service';

describe('BaseAggregateService', () => {
  class Entity extends BaseEntity {
    name: string;
  }

  class TestService extends BaseAggregateService<Entity> {
    protected entity: Type<Entity>;
    protected callback: AfterSaveCallback<Entity> | undefined;

    constructor(protected readonly _: Model<Entity>) {
      super(_);
    }
  }

  let service: TestService;
  let modelMock: Model<Entity>;

  const pipelineStages = [{ $match: { name: 'test' } }] as PipelineStage[];
  const aggregated = { _id: 'ObjectId' as unknown as ObjectId, __v: 1, name: 'test' } as Entity;

  const initService = (documents: Entity[] = [], withPagination = false) => {
    modelMock = {
      aggregate: jest.fn().mockResolvedValue(!withPagination
        ? documents
        : [{ docs: documents, count: [{ totalElements: documents.length }] }]
      ),
    } as unknown as Model<Entity>;

    return new TestService(modelMock);
  }

  it('should have aggregate method', () => {
    const service = initService();
    expect(service).toHaveProperty('aggregate');
  });

  describe('aggregate', () => {
    it('should return list without pagination', async () => {
      service = initService([aggregated]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = aggregated;

      await expect(service.aggregate(pipelineStages)).resolves.toStrictEqual({
        list: [{
          ...documentWithoutIdAndVersion,
          id: aggregated._id,
        }],
        count: 1,
        totalPage: 1,
      });
    });

    it('should return found with pagination', async () => {
      service = initService([aggregated], true);
      const pipeline = [...pipelineStages, { $limit: 2 }, { $skip: 0 }];
      const pipelineStagesWithPagination = [
        { $facet: { docs: pipeline, count: [...pipeline, { $count: 'totalElements' }] } },
      ] as PipelineStage[];

      await expect(service.aggregate(pipelineStagesWithPagination)).resolves.toStrictEqual({
        list: [{
          id: aggregated._id,
          name: 'test',
        }],
        count: 1,
        totalPage: 1,
      });
    });

    it('should call callback if it is defined', async () => {
      service = initService([aggregated]);
      const callback = jest.fn(() => Promise.resolve());
      service['callback'] = callback;
      const user = { id: 'userId' };
      await service.aggregate(pipelineStages, user);

      expect(callback).toHaveBeenCalledWith({ ...aggregated, id: aggregated._id }, service['callbackMethods'], user);
    });

    it('should filter documents when predicateBehavior is filter and abilityPredicate rejects some', async () => {
      const allowed = { _id: 'id1' as unknown as ObjectId, __v: 0, name: 'allowed' } as Entity;
      const denied = { _id: 'id2' as unknown as ObjectId, __v: 0, name: 'denied' } as Entity;
      service = initService([allowed, denied]);
      Object.defineProperty(service, 'abilityPredicate', { value: (entity: Entity) => entity.name === 'allowed', configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });
      const user = { id: 'userId' };

      const result = await service.aggregate(pipelineStages, user);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].name).toBe('allowed');
      expect(result.count).toBe(1);
    });

    it('should return empty list when predicateBehavior is filter and abilityPredicate rejects all', async () => {
      service = initService([aggregated]);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });

      const result = await service.aggregate(pipelineStages);

      expect(result.list).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should return all documents when predicateBehavior is filter and abilityPredicate allows all', async () => {
      service = initService([aggregated]);
      Object.defineProperty(service, 'abilityPredicate', { value: () => true, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });

      const result = await service.aggregate(pipelineStages);

      expect(result.list).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should not filter when predicateBehavior is throw', async () => {
      service = initService([aggregated]);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'throw', configurable: true });

      const result = await service.aggregate(pipelineStages);

      // 'throw' mode = guard handles it; service returns all
      expect(result.list).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should throw an error if the create query fails', async () => {
      service = initService();
      (modelMock.aggregate as jest.Mock).mockRejectedValue(new Error('create error'));

      await expect(service.aggregate(pipelineStages)).rejects.toThrow('create error');
    });
  });
});
