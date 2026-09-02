import { describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CallbackMethods, AfterSaveCallback, CallbackRetryOptions, PopulateConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseGetOneService } from './base-get-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseGetOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  populate: PopulateConfig | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseGetOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const response = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (exec = vi.fn()) => {
    modelMock = {
      findOne: vi.fn(() => ({
        lean: vi.fn(() => ({ exec })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have getOne method', () => {
    service = initService();
    expect(service).toHaveProperty('getOne');
  });

  describe('getOne', () => {
    it('should call model.findOne and return the response', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response;

      await expect(service.getOne('ObjectId')).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: response._id,
      });
      expect(modelMock.findOne).toHaveBeenCalledWith({ _id: 'ObjectId' });
    });

    it('should call model.findOne with soft deletable query', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getOne('ObjectId');

      expect(modelMock.findOne).toHaveBeenCalledWith({ _id: 'ObjectId', isDeleted: false });
    });

    it('should call callback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const user = { id: 'userId' };
      await service.getOne('ObjectId', user);

      expect(callback).toHaveBeenCalledWith({ ...response, id: response._id }, internal(service).callbackMethods, user);
    });

    it('should not throw and should still return the entity when callback rejects', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = vi.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response;

      await expect(service.getOne('ObjectId')).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: response._id,
      });
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.getOne('ObjectId');

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should populate the query when populate is configured', async () => {
      const exec = vi.fn().mockResolvedValueOnce(response);
      const queryMock: { populate: Mock; lean: Mock } = {
        populate: vi.fn(),
        lean: vi.fn(() => ({ exec })),
      };
      queryMock.populate.mockReturnValue(queryMock);
      modelMock = {
        findOne: vi.fn(() => queryMock),
      } as unknown as Model<TestEntity>;
      service = new TestService(modelMock);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).populate = 'author';

      await service.getOne('ObjectId');

      expect(queryMock.populate).toHaveBeenCalledWith('author');
    });

    it('should throw error if document not found', async () => {
      const exec = vi.fn().mockResolvedValueOnce(undefined);
      service = initService(exec);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.getOne('ObjectId')).rejects.toThrow(
        new NotFoundException('Document not found'),
      );
    });
  });
});
