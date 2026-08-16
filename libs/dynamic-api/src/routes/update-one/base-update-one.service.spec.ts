import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateOneService } from './base-update-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseUpdateOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveCallback<TestEntity> | undefined;
  auditLog: boolean | undefined;
  writeAuditLog: jest.Mock;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseUpdateOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const updatedDocument = { ...document, _id: 'UpdatedObjectId', name: 'updated' };

  const initService = (exec = jest.fn(), findOneExec = jest.fn()) => {
    modelMock = {
      findOne: jest.fn(() => ({ lean: jest.fn(() => ({ exec: findOneExec })) })),
      findOneAndUpdate: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have updateOne method', () => {
    service = initService();
    expect(service).toHaveProperty('updateOne');
  });

  describe('updateOne', () => {
    it('should throw an error if the document to update does not exist', async () => {
      service = initService(jest.fn(), jest.fn().mockResolvedValueOnce(undefined));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateOne(document._id, { name: 'replaced' } as Partial<TestEntity>),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndUpdate and return the new document', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = updatedDocument;

      await expect(
        service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: updatedDocument._id });

      expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: document._id },
        { $set: { name: updatedDocument.name } },
        { new: true },
      );
    });

    it('should call callback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledWith(
        { ...updatedDocument, id: updatedDocument._id },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to callback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(callback).toHaveBeenCalledWith(
        { ...updatedDocument, id: updatedDocument._id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should not throw and should still return the updated entity when callback rejects', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = jest.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = updatedDocument;

      await expect(
        service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: updatedDocument._id });
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn().mockResolvedValue({}) as BeforeSaveCallback<TestEntity>;
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, update: { name: updatedDocument.name } },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn().mockResolvedValue({}) as BeforeSaveCallback<TestEntity>;
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, update: { name: updatedDocument.name } },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call writeAuditLog with before and after documents when auditLog is enabled', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(1);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('update', document._id, document, updatedDocument, fakeUser);
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: jest.Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });
});
