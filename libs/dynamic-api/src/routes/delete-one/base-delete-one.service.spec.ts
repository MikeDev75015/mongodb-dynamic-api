import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  CallbackMethods,
  BeforeSaveDeleteCallback,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDeleteOneService } from './base-delete-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDeleteOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveDeleteCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDeleteOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;
  const id = 'ObjectId';
  const document = { _id: id, __v: 1, name: 'test' };
  const deleted = { deletedCount: 1 };
  let presenter: DeletePresenter;

  const initService = (findOneResult: object | null = document) => {
    modelMock = {
      findOne: jest.fn(() => ({
        lean: jest.fn(() => ({
          exec: jest.fn(() => Promise.resolve(findOneResult)),
        })),
      })),
      deleteOne: jest.fn(() => ({
        exec: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
      })),
      updateOne: jest.fn(() => ({
        exec: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  }

  beforeEach(() => {
    presenter = plainToInstance(DeletePresenter, deleted);
  });

  it('should have deleteOne method', () => {
    service = initService();
    expect(service).toHaveProperty('deleteOne');
  });

  it('should set deletedCount to 0 on error', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
      exec: () => Promise.reject(new Error('Test error')),
    });
    presenter.deletedCount = 0;

    await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
  });

  describe('deleteOne without softDeletable', () => {
    it('should call model.deleteOne and return the number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
      expect(modelMock.deleteOne).toHaveBeenCalledWith({ _id: id });
    });
  });

  describe('deleteOne with softDeletable', () => {
    it('should call model.updateOne and return the number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 1 }),
      });

      await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
      expect(modelMock.updateOne).toHaveBeenCalledWith(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: expect.any(Number) } },
      );
    });

    it('should call model.updateOne and return 0 as number of deleted documents', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 0 }),
      });
      presenter.deletedCount = 0;

      await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
    });
  });

  it('should call callback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = jest.fn(() => Promise.resolve());
    internal(service).callback = callback;
    await service.deleteOne(id);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      { ...document, id: document._id },
      internal(service).callbackMethods,
    );
  });

  it('should call beforeSaveCallback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = jest.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    await service.deleteOne(id);

    expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
    expect(beforeSaveCallback).toHaveBeenCalledWith(
      { ...document, id: document._id },
      { id },
      internal(service).callbackMethods,
    );
  });
});
