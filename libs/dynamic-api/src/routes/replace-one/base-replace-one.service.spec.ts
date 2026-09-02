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
import { BaseReplaceOneService } from './base-replace-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseReplaceOneService<TestEntity> {
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

describe('BaseReplaceOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const replacedDocument = { ...document, _id: 'ReplacedObjectId', name: 'replaced' };

  const initService = (findOneExec = vi.fn(), findOneAndReplaceExec = vi.fn()) => {
    modelMock = {
      findOne: vi.fn(() => ({
        lean: vi.fn(() => ({ exec: findOneExec })),
      })),
      findOneAndReplace: vi.fn(() => ({
        lean: vi.fn(() => ({ exec: findOneAndReplaceExec })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have replaceOne method', () => {
    service = initService();
    expect(service).toHaveProperty('replaceOne');
  });

  describe('replaceOne', () => {
    it('should throw an error if the document to replace does not exist', async () => {
      service = initService(vi.fn().mockResolvedValueOnce(undefined));
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.replaceOne(document._id, { name: 'replaced' } as Partial<TestEntity>),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndReplace and return the new document', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = replacedDocument;

      await expect(
        service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: replacedDocument._id });

      expect(modelMock.findOneAndReplace).toHaveBeenCalledWith(
        { _id: document._id },
        { name: replacedDocument.name },
        { new: true, setDefaultsOnInsert: true },
      );
    });

    it('should call callback if it is defined', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledWith(
        { ...replacedDocument, id: replacedDocument._id },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to callback if it is defined', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(callback).toHaveBeenCalledWith(
        { ...replacedDocument, id: replacedDocument._id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should not throw and should still return the replaced entity when callback rejects', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).callback = vi.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = replacedDocument;

      await expect(
        service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: replacedDocument._id });
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = vi.fn(() => Promise.resolve({ name: replacedDocument.name }));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, replacement: { name: replacedDocument.name } },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = vi.fn(() => Promise.resolve({ name: replacedDocument.name }));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, replacement: { name: replacedDocument.name } },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call writeAuditLog with before and after documents when auditLog is enabled', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = vi
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(1);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('replace', document._id, document, replacedDocument, fakeUser);
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      service = initService(
        vi.fn().mockResolvedValueOnce(document),
        vi.fn().mockResolvedValueOnce(replacedDocument),
      );
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = vi
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });
});
