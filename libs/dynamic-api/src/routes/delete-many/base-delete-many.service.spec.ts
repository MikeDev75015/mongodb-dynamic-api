import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  CallbackMethods,
  BeforeSaveDeleteManyCallback,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDeleteManyService } from './base-delete-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDeleteManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveDeleteManyCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDeleteManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;
  let presenter: DeletePresenter;

  const ids = ['ObjectId1', 'ObjectId2'];
  const documents = [
    { _id: 'ObjectId1', __v: 1, name: 'test 1' },
    { _id: 'ObjectId2', __v: 1, name: 'test 2' },
  ];
  const deleted = { deletedCount: 2 };

  const initService = (findResult: object[] = documents) => {
    modelMock = {
      find: jest.fn(() => ({
        lean: jest.fn(() => ({
          exec: jest.fn(() => Promise.resolve(findResult)),
        })),
      })),
      deleteMany: jest.fn(() => (
        {
          exec: jest.fn().mockResolvedValue({ deletedCount: ids.length }),
        }
      )),
      updateMany: jest.fn(() => (
        {
          exec: jest.fn().mockResolvedValue({ modifiedCount: ids.length }),
        }
      )),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  }

  beforeEach(() => {
    presenter = plainToInstance(DeletePresenter, deleted);
  });

  it('should have deleteMany method', () => {
    const service = initService();
    expect(service).toHaveProperty('deleteMany');
  });

  it('should set deletedCount to 0 on error', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (
      modelMock.updateMany as jest.Mock
    ).mockReturnValueOnce({
      exec: () => Promise.reject(new Error('Test error')),
    });
    presenter.deletedCount = 0;

    await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
  });

  describe('deleteMany without softDeletable', () => {
    it('should call model.deleteMany and return the number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
      expect(modelMock.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
    });
  });

  describe('deleteMany with softDeletable', () => {
    it('should call model.updateMany and return the number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (
        modelMock.updateMany as jest.Mock
      ).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 2 }),
      });

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
      expect(modelMock.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: expect.any(Number) } },
      );
    });

    it('should call model.updateMany and return 0 as number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (
        modelMock.updateMany as jest.Mock
      ).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 0 }),
      });
      presenter.deletedCount = 0;

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
    });
  });

  it('should call callback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = jest.fn(() => Promise.resolve());
    internal(service).callback = callback;
    await service.deleteMany(ids);

    expect(callback).toHaveBeenNthCalledWith(
      1,
      { ...documents[0], id: documents[0]._id },
      internal(service).callbackMethods,
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      { ...documents[1], id: documents[1]._id },
      internal(service).callbackMethods,
    );
  });

  it('should call beforeSaveCallback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = jest.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    await service.deleteMany(ids);

    expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
    expect(beforeSaveCallback).toHaveBeenCalledWith(
      documents,
      { ids },
      internal(service).callbackMethods,
    );
  });
});
