import { describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateOneService } from './base-duplicate-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDuplicateOneService<TestEntity> {
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
  writeAuditLog: Mock;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDuplicateOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const duplicatedDocument = { ...document, _id: 'NewObjectId' };

  const initService = (exec = vi.fn(), created: object | undefined = undefined) => {
    modelMock = {
      findOne: vi.fn(() => ({ lean: vi.fn(() => ({ exec })) })),
      create: vi.fn(() => Promise.resolve(created)),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have duplicateOne method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateOne');
  });

  describe('duplicateOne', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateOne(document._id, undefined)).rejects.toThrow('Document not found');
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = duplicatedDocument;

      await expect(service.duplicateOne(document._id, undefined)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: duplicatedDocument._id,
      });

      expect(modelMock.findOne).toHaveBeenNthCalledWith(1, { _id: document._id });
      expect(modelMock.findOne).toHaveBeenNthCalledWith(2, { _id: duplicatedDocument._id });
      expect(modelMock.create).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should call callback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.duplicateOne(document._id, undefined);

      expect(callback).toHaveBeenCalledWith(
        { ...duplicatedDocument, id: duplicatedDocument._id },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to callback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.duplicateOne(document._id, undefined, fakeUser);

      expect(callback).toHaveBeenCalledWith(
        { ...duplicatedDocument, id: duplicatedDocument._id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should not throw and should still return the duplicated entity when callback rejects', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = vi.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = duplicatedDocument;

      await expect(service.duplicateOne(document._id, undefined)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: duplicatedDocument._id,
      });
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.duplicateOne(document._id, undefined);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = vi.fn(() => Promise.resolve({ name: 'test' }));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.duplicateOne(document._id, undefined);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, override: undefined },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = vi.fn(() => Promise.resolve({ name: 'test' }));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.duplicateOne(document._id, undefined, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, override: undefined },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call writeAuditLog with the duplicated document when auditLog is enabled', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = vi
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.duplicateOne(document._id, undefined, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(1);
      expect(writeAuditLogSpy).toHaveBeenCalledWith(
        'duplicate', duplicatedDocument._id, null, duplicatedDocument, fakeUser,
      );
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      const exec = vi.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = vi
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.duplicateOne(document._id, undefined);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });
});
