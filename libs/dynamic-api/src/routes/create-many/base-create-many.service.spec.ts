import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveListCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateManyService } from './base-create-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseCreateManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveListCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseCreateManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const toCreate = { name: 'test' } as Partial<TestEntity>;
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (documents: any[] = []) => {
    modelMock = {
      create: jest.fn().mockResolvedValue([created]),
      find: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(documents),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  }

  it('should have createMany method', () => {
    const service = initService();
    expect(service).toHaveProperty('createMany');
  });

  describe('createMany', () => {
    it('should return created list with id defined', async () => {
      service = initService([created]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createMany([toCreate])).resolves.toStrictEqual([{
        ...documentWithoutIdAndVersion,
        id: created._id,
      }]);
    });

    it('should call callback if it is defined', async () => {
      service = initService([created]);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.createMany([toCreate]);

      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, internal(service).callbackMethods, undefined);
    });

    it('should pass user to callback if it is defined', async () => {
      service = initService([created]);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.createMany([toCreate], fakeUser);

      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, internal(service).callbackMethods, fakeUser);
    });

    it('should not throw and should still return the full batch when one document\'s callback rejects', async () => {
      const created2 = { _id: 'ObjectId2', __v: 1, name: 'test2' };
      service = initService([created, created2]);
      internal(service).callback = jest.fn((entity: TestEntity) => (
        (entity as unknown as { id: string }).id === created._id
          ? Promise.reject(new Error('boom'))
          : Promise.resolve()
      ));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id: id1, __v: v1, ...doc1 } = created;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id: id2, __v: v2, ...doc2 } = created2;

      await expect(service.createMany([toCreate, toCreate])).resolves.toStrictEqual([
        { ...doc1, id: created._id },
        { ...doc2, id: created2._id },
      ]);
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      service = initService([created]);
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.createMany([toCreate]);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the document already exists', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue({
        code: 11000,
        keyValue: { name: 'test' },
      });

      await expect(service.createMany([toCreate])).rejects.toThrow(
        "name 'test' is already used",
      );
    });

    it('should throw an error if the create query fails', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue(new Error('create error'));

      await expect(service.createMany([toCreate])).rejects.toThrow('create error');
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      service = initService([created]);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([toCreate]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.createMany([toCreate]);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        undefined,
        { toCreate: [toCreate] },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      service = initService([created]);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([toCreate]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.createMany([toCreate], fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        undefined,
        { toCreate: [toCreate] },
        internal(service).callbackMethods,
        fakeUser,
      );
    });
  });
});
