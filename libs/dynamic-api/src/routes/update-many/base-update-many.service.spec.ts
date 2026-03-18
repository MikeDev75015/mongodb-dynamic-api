import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveListCallback,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateManyService } from './base-update-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseUpdateManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveListCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseUpdateManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const ids = ['ObjectId', 'ObjectId2'];
  const documents = [{ _id: 'ObjectId', __v: 1, name: 'test' }, { _id: 'ObjectId2', __v: 1, name: 'test2' }];
  const updatedDocuments = [
    { ...documents[0], _id: 'UpdatedObjectId', name: 'updated' },
    { ...documents[1], _id: 'UpdatedObjectId2', name: 'updated' },
  ];

  const initService = (exec = jest.fn()) => {
    modelMock = {
      find: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
      updateMany: jest.fn(() => ({ lean: jest.fn(() => ({ exec: jest.fn().mockResolvedValueOnce([]) })) })),
      findByIdAndUpdate: jest.fn(() => ({ lean: jest.fn(() => ({ exec: jest.fn().mockResolvedValueOnce({}) })) })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have updateMany method', () => {
    service = initService();
    expect(service).toHaveProperty('updateMany');
  });

  describe('updateMany', () => {
    it('should throw an error if one of the documents to update does not exist', async () => {
      const exec = jest.fn().mockResolvedValueOnce([documents[0]]);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateMany(ids, { name: 'replaced' } as Partial<TestEntity>),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.updateMany and return the updated documents', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(
        service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>),
      ).resolves.toStrictEqual(updatedDocuments.map(({ _id: id, name }) => ({ name, id })));

      expect(modelMock.find).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });
      expect(modelMock.updateMany).toHaveBeenCalledWith({ _id: { $in: ids } }, { name: 'updated' });
      expect(modelMock.find).toHaveBeenNthCalledWith(2, { _id: { $in: ids } });
    });

    it('should call with isDeleted: false if isSoftDeletable is true', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(modelMock.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids }, isDeleted: false },
        { name: 'updated' },
      );
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(callback).toHaveBeenNthCalledWith(
        1,
        { ...updatedDocuments[0], id: updatedDocuments[0]._id },
        internal(service).callbackMethods,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...updatedDocuments[1], id: updatedDocuments[1]._id },
        internal(service).callbackMethods,
      );
    });

    it('should call beforeSaveCallback if it is defined and use findByIdAndUpdate per entity', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([{ name: 'updated' }, { name: 'updated' }]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        documents,
        { ids, update: { name: 'updated' } },
        internal(service).callbackMethods,
      );

      expect(modelMock.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(modelMock.findByIdAndUpdate).toHaveBeenNthCalledWith(
        1,
        documents[0]._id,
        { name: 'updated' },
        { new: true },
      );
      expect(modelMock.findByIdAndUpdate).toHaveBeenNthCalledWith(
        2,
        documents[1]._id,
        { name: 'updated' },
        { new: true },
      );
      expect(modelMock.updateMany).not.toHaveBeenCalled();
    });
  });
});
