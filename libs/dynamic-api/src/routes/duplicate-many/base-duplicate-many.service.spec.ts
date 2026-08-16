import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveListCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateManyService } from './base-duplicate-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDuplicateManyService<TestEntity> {
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

describe('BaseDuplicateManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const ids = ['ObjectId1', 'ObjectId2'];
  const documents = [
    { _id: 'ObjectId1', __v: 1, name: 'test 1' },
    { _id: 'ObjectId2', __v: 1, name: 'test 2' },
  ];
  const duplicatedDocuments = [
    { ...documents[0], _id: 'NewObjectId1' },
    { ...documents[1], _id: 'NewObjectId2' },
  ];

  const initService = (exec = jest.fn(), created: object[] = []) => {
    modelMock = {
      find: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
      create: jest.fn(() => Promise.resolve(created)),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have duplicateMany method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateMany');
  });

  describe('duplicateMany', () => {
    it('should throw an error if documents to duplicate do not exist', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateMany(ids, undefined)).rejects.toThrow('Document not found');
    });

    it('should call model.find, model.create and return the duplicated documents', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.duplicateMany(ids, undefined)).resolves.toStrictEqual(
        duplicatedDocuments.map(({ _id: id, name }) => ({ name, id })),
      );

      expect(modelMock.find).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });
      expect(modelMock.find).toHaveBeenNthCalledWith(2, {
        _id: { $in: duplicatedDocuments.map(({ _id }) => _id) },
      });
      expect(modelMock.create).toHaveBeenCalledWith([{ name: 'test 1' }, { name: 'test 2' }]);
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;

      await service.duplicateMany(ids, undefined);

      expect(callback).toHaveBeenNthCalledWith(
        1,
        { ...duplicatedDocuments[0], id: duplicatedDocuments[0]._id },
        internal(service).callbackMethods,
        undefined,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...duplicatedDocuments[1], id: duplicatedDocuments[1]._id },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };

      await service.duplicateMany(ids, undefined, fakeUser);

      expect(callback).toHaveBeenNthCalledWith(
        1,
        { ...duplicatedDocuments[0], id: duplicatedDocuments[0]._id },
        internal(service).callbackMethods,
        fakeUser,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...duplicatedDocuments[1], id: duplicatedDocuments[1]._id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should not throw and should still return the full batch when one document\'s callback rejects', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      internal(service).callback = jest.fn((entity: TestEntity) => (
        (entity as unknown as { id: string }).id === duplicatedDocuments[0]._id
          ? Promise.reject(new Error('boom'))
          : Promise.resolve()
      ));

      await expect(service.duplicateMany(ids, undefined)).resolves.toStrictEqual(
        duplicatedDocuments.map(({ _id: id, name }) => ({ name, id })),
      );
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      const exec = jest.fn().mockResolvedValueOnce([documents[0]]).mockResolvedValueOnce([duplicatedDocuments[0]]);
      service = initService(exec, [duplicatedDocuments[0]]);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.duplicateMany([ids[0]], undefined);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([{ name: 'test 1' }, { name: 'test 2' }]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.duplicateMany(ids, undefined);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        documents,
        { ids, override: undefined },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([{ name: 'test 1' }, { name: 'test 2' }]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.duplicateMany(ids, undefined, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        documents,
        { ids, override: undefined },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call writeAuditLog for each duplicated document when auditLog is enabled', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.duplicateMany(ids, undefined, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(2);
      expect(writeAuditLogSpy).toHaveBeenCalledWith(
        'duplicate', duplicatedDocuments[0]._id, null, duplicatedDocuments[0], fakeUser,
      );
      expect(writeAuditLogSpy).toHaveBeenCalledWith(
        'duplicate', duplicatedDocuments[1]._id, null, duplicatedDocuments[1], fakeUser,
      );
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.duplicateMany(ids, undefined);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });
});
