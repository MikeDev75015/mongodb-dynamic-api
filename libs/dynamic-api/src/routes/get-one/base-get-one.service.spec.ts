import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CallbackMethods, AfterSaveCallback } from '../../interfaces';
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
  callbackMethods: CallbackMethods;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseGetOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const response = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (exec = jest.fn()) => {
    modelMock = {
      findOne: jest.fn(() => ({
        lean: jest.fn(() => ({ exec })),
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
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response;

      await expect(service.getOne('ObjectId')).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: response._id,
      });
      expect(modelMock.findOne).toHaveBeenCalledWith({ _id: 'ObjectId' });
    });

    it('should call model.findOne with soft deletable query', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getOne('ObjectId');

      expect(modelMock.findOne).toHaveBeenCalledWith({ _id: 'ObjectId', isDeleted: false });
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.getOne('ObjectId');

      expect(callback).toHaveBeenCalledWith({ ...response, id: response._id }, internal(service).callbackMethods);
    });

    it('should throw error if document not found', async () => {
      const exec = jest.fn().mockResolvedValueOnce(undefined);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.getOne('ObjectId')).rejects.toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });
});
