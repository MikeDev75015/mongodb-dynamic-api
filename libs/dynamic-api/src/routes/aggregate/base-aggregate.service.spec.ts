import { Type } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model, ObjectId } from 'mongoose';
import { DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseAggregateService } from './base-aggregate.service';

describe('BaseAggregateService', () => {
  class Entity extends BaseEntity {
    name: string;
  }

  class TestService extends BaseAggregateService<Entity> {
    protected entity: Type<Entity>;
    protected callback: DynamicApiServiceCallback<Entity> | undefined;

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
      await service.aggregate(pipelineStages);

      expect(callback).toHaveBeenCalledWith({ ...aggregated, id: aggregated._id }, service['callbackMethods']);
    });

    it('should throw an error if the create query fails', async () => {
      service = initService();
      (modelMock.aggregate as jest.Mock).mockRejectedValue(new Error('create error'));

      await expect(service.aggregate(pipelineStages)).rejects.toThrow('create error');
    });
  });
});
