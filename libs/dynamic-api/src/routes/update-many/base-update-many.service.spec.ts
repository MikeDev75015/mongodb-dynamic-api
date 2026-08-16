import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveListCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
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
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveListCallback<TestEntity> | undefined;
  auditLog: boolean | undefined;
  writeAuditLog: jest.Mock;
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
        undefined,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...updatedDocuments[1], id: updatedDocuments[1]._id },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>, fakeUser);

      expect(callback).toHaveBeenNthCalledWith(
        1,
        { ...updatedDocuments[0], id: updatedDocuments[0]._id },
        internal(service).callbackMethods,
        fakeUser,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...updatedDocuments[1], id: updatedDocuments[1]._id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should not throw and should still return the full batch when one document\'s callback rejects', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = jest.fn((entity: TestEntity) => (
        (entity as unknown as { id: string }).id === updatedDocuments[0]._id
          ? Promise.reject(new Error('boom'))
          : Promise.resolve()
      ));

      await expect(
        service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>),
      ).resolves.toStrictEqual(updatedDocuments.map(({ _id: id, name }) => ({ name, id })));
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledTimes(3);
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
        undefined,
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

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([{ name: 'updated' }, { name: 'updated' }]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        documents,
        { ids, update: { name: 'updated' } },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call writeAuditLog with the matched before document per updated entity when auditLog is enabled', async () => {
      const updatedSameId = documents.map((d) => ({ ...d, name: 'updated' }));
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedSameId);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(2);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('update', documents[0]._id, documents[0], updatedSameId[0], fakeUser);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('update', documents[1]._id, documents[1], updatedSameId[1], fakeUser);
    });

    it('should fall back to a null before-state when no matching document was pre-fetched', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(writeAuditLogSpy).toHaveBeenCalledWith('update', updatedDocuments[0]._id, null, updatedDocuments[0], undefined);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('update', updatedDocuments[1]._id, null, updatedDocuments[1], undefined);
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.updateMany(ids, { name: 'updated' } as Partial<TestEntity>);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });
});
