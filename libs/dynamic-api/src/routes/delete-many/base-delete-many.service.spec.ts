import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  CallbackMethods,
  BeforeSaveDeleteManyCallback,
  BeforeDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  AfterSaveCallback,
  CallbackRetryOptions,
  CascadeConfig,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { BaseDeleteManyService } from './base-delete-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class ChildEntity extends BaseEntity {
  parentId: string;
}

class TestService extends BaseDeleteManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveDeleteManyCallback<TestEntity> | undefined;
  beforeDeleteCallback: BeforeDeleteManyCallback<TestEntity, BeforeSaveDeleteManyContext> | undefined;
  cascade: CascadeConfig[] | undefined;
  auditLog: boolean | undefined;
  writeAuditLog: Mock;
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

  // Standalone-MongoDB-shaped error: model.db.startSession() rejecting this way is exactly what
  // deleteWithCascade's isTransactionsUnsupportedError check is designed to catch and fall back on.
  const transactionsUnsupportedError = Object.assign(
    new Error('Transaction numbers are only allowed on a replica set member or mongos'),
    { code: 20 },
  );

  const initService = (findResult: object[] = documents) => {
    modelMock = {
      find: vi.fn(() => ({
        lean: vi.fn(() => ({
          exec: vi.fn(() => Promise.resolve(findResult)),
        })),
      })),
      deleteMany: vi.fn(() => (
        {
          exec: vi.fn().mockResolvedValue({ deletedCount: ids.length }),
        }
      )),
      updateMany: vi.fn(() => (
        {
          exec: vi.fn().mockResolvedValue({ modifiedCount: ids.length }),
        }
      )),
      db: {
        startSession: vi.fn().mockRejectedValue(transactionsUnsupportedError),
      },
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
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (
      modelMock.updateMany as Mock
    ).mockReturnValueOnce({
      exec: () => Promise.reject(new Error('Test error')),
    });
    presenter.deletedCount = 0;

    await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
  });

  describe('deleteMany without softDeletable', () => {
    it('should call model.deleteMany and return the number of deleted documents', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
      expect(modelMock.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
    });
  });

  describe('deleteMany with softDeletable', () => {
    it('should call model.updateMany and return the number of deleted documents', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (
        modelMock.updateMany as Mock
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
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (
        modelMock.updateMany as Mock
      ).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 0 }),
      });
      presenter.deletedCount = 0;

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
    });
  });

  it('should call callback if it is defined', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = vi.fn(() => Promise.resolve());
    internal(service).callback = callback;
    await service.deleteMany(ids);

    expect(callback).toHaveBeenNthCalledWith(
      1,
      { ...documents[0], id: documents[0]._id },
      internal(service).callbackMethods,
      undefined,
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      { ...documents[1], id: documents[1]._id },
      internal(service).callbackMethods,
      undefined,
    );
  });

  it('should pass user to callback if it is defined', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = vi.fn(() => Promise.resolve());
    internal(service).callback = callback;
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    await service.deleteMany(ids, fakeUser);

    expect(callback).toHaveBeenNthCalledWith(
      1,
      { ...documents[0], id: documents[0]._id },
      internal(service).callbackMethods,
      fakeUser,
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      { ...documents[1], id: documents[1]._id },
      internal(service).callbackMethods,
      fakeUser,
    );
  });

  it('should return the real deletedCount (not 0) when one document\'s callback rejects — masking bug fix', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    internal(service).callback = vi.fn((entity: TestEntity) => (
      (entity as unknown as { id: string }).id === documents[0]._id
        ? Promise.reject(new Error('boom'))
        : Promise.resolve()
    ));

    await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
    expect(presenter.deletedCount).toBe(2);
  });

  it('should succeed on retry when callbackRetry is configured', async () => {
    service = initService([documents[0]]);
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    internal(service).callback = callback;
    internal(service).callbackRetry = { attempts: 2 };

    await service.deleteMany([ids[0]]);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should call beforeSaveCallback if it is defined', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = vi.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    await service.deleteMany(ids);

    expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
    expect(beforeSaveCallback).toHaveBeenCalledWith(
      documents,
      { ids },
      internal(service).callbackMethods,
      undefined,
    );
  });

  it('should pass user to beforeSaveCallback if it is defined', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = vi.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    await service.deleteMany(ids, fakeUser);

    expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
    expect(beforeSaveCallback).toHaveBeenCalledWith(
      documents,
      { ids },
      internal(service).callbackMethods,
      fakeUser,
    );
  });

  it('should propagate exception thrown by beforeSaveCallback (fix: no longer swallowed)', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const error = new BadRequestException('blocked by beforeSaveCallback');
    internal(service).beforeSaveCallback = vi.fn(() => Promise.reject(error));

    await expect(service.deleteMany(ids)).rejects.toThrow(BadRequestException);
    expect(modelMock.deleteMany).not.toHaveBeenCalled();
  });

  it('should include isDeleted filter in pre-hook find when soft-deletable', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (modelMock.updateMany as Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 2 }) });
    const beforeDeleteCallback = vi.fn(() => Promise.resolve());
    internal(service).beforeDeleteCallback = beforeDeleteCallback;
    await service.deleteMany(ids);

    expect(modelMock.find).toHaveBeenCalledWith({ _id: { $in: ids }, isDeleted: false });
  });

  it('should skip second find when documents already loaded by hook and callback is set', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeDeleteCallback = vi.fn(() => Promise.resolve());
    const callback = vi.fn(() => Promise.resolve());
    internal(service).beforeDeleteCallback = beforeDeleteCallback;
    internal(service).callback = callback;
    await service.deleteMany(ids);

    // find called once (pre-hook), NOT a second time inside try
    expect(modelMock.find).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should include isDeleted filter in inner find for callback when soft-deletable and no hooks set', async () => {
    service = initService();
    vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (modelMock.updateMany as Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 2 }) });
    const callback = vi.fn(() => Promise.resolve());
    internal(service).callback = callback;
    await service.deleteMany(ids);

    expect(modelMock.find).toHaveBeenCalledWith({ _id: { $in: ids }, isDeleted: false });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  describe('auditLog', () => {
    it('should call writeAuditLog for each deleted document when auditLog is enabled', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);
      const fakeUser = { id: 'user-1' };

      await service.deleteMany(ids, fakeUser);

      expect(writeAuditLogSpy).toHaveBeenCalledTimes(2);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('delete', documents[0]._id, documents[0], null, fakeUser);
      expect(writeAuditLogSpy).toHaveBeenCalledWith('delete', documents[1]._id, documents[1], null, fakeUser);
    });

    it('should not call writeAuditLog when auditLog is not enabled', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.deleteMany(ids);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });

    it('should not call writeAuditLog when no documents were found', async () => {
      service = initService([]);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).auditLog = true;
      const writeAuditLogSpy = jest
        .spyOn(service as unknown as { writeAuditLog: Mock }, 'writeAuditLog')
        .mockResolvedValue(undefined);

      await service.deleteMany(ids);

      expect(writeAuditLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('beforeDeleteCallback', () => {
    it('should call beforeDeleteCallback before the delete', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = vi.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      await service.deleteMany(ids);

      expect(beforeDeleteCallback).toHaveBeenCalledTimes(1);
      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        documents,
        { ids },
        internal(service).callbackMethods,
        undefined,
      );
      expect(modelMock.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('should pass user to beforeDeleteCallback', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = vi.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.deleteMany(ids, fakeUser);

      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        documents,
        { ids },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should propagate exception and abort delete when beforeDeleteCallback throws', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const error = new BadRequestException('forbidden');
      internal(service).beforeDeleteCallback = vi.fn(() => Promise.reject(error));

      await expect(service.deleteMany(ids)).rejects.toThrow(BadRequestException);
      expect(modelMock.deleteMany).not.toHaveBeenCalled();
    });

    it('should call beforeDeleteCallback with empty array when no documents found', async () => {
      service = initService([]);
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = vi.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      await service.deleteMany(ids);

      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        [],
        { ids },
        internal(service).callbackMethods,
        undefined,
      );
    });
  });

  describe('cascade', () => {
    let childModelMock: { deleteMany: Mock; updateMany: Mock };
    const cascadeConfig: CascadeConfig = {
      entity: ChildEntity,
      foreignKey: 'parentId',
      on: 'delete',
    };

    beforeEach(() => {
      childModelMock = {
        deleteMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ deletedCount: 3 }) })),
        updateMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ modifiedCount: 3 }) })),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(
        childModelMock as unknown as ReturnType<typeof DynamicApiGlobalStateService.getEntityModel> extends Promise<infer M> ? M : never,
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should hard-delete children when on=delete and parent is hard-deleted', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      await service.deleteMany(ids);

      expect(childModelMock.deleteMany).toHaveBeenCalledWith({ parentId: { $in: ids } });
    });

    it('should not cascade when on=delete and parent is soft-deleted', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateMany as Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 2 }),
      });
      internal(service).cascade = [cascadeConfig];

      await service.deleteMany(ids);

      expect(childModelMock.deleteMany).not.toHaveBeenCalled();
    });

    it('should soft-delete children when on=softDelete and parent is soft-deleted', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateMany as Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 2 }),
      });
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete' }];

      await service.deleteMany(ids);

      expect(childModelMock.updateMany).toHaveBeenCalledWith(
        { parentId: { $in: ids } },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
    });

    it('should hard-delete children with softDelete:false override even when parent is soft-deleted', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateMany as Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 2 }),
      });
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete', softDelete: false }];

      await service.deleteMany(ids);

      expect(childModelMock.deleteMany).toHaveBeenCalledWith({ parentId: { $in: ids } });
    });

    it('should soft-delete children with softDelete:true override even when parent is hard-deleted', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [{ ...cascadeConfig, softDelete: true }];

      await service.deleteMany(ids);

      expect(childModelMock.updateMany).toHaveBeenCalledWith(
        { parentId: { $in: ids } },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
    });

    it('should not execute cascade when deletedCount is 0', async () => {
      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      (modelMock.deleteMany as Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ deletedCount: 0 }),
      });
      internal(service).cascade = [cascadeConfig];

      await service.deleteMany(ids);

      expect(childModelMock.deleteMany).not.toHaveBeenCalled();
    });

    it('should execute multiple cascade configs', async () => {
      class AnotherChild extends BaseEntity { postId: string; }
      const anotherChildModelMock = {
        deleteMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ deletedCount: 1 }) })),
        updateMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }) })),
      };
      (DynamicApiGlobalStateService.getEntityModel as Mock)
        .mockResolvedValueOnce(childModelMock)
        .mockResolvedValueOnce(anotherChildModelMock);

      service = initService();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [
        cascadeConfig,
        { entity: AnotherChild, foreignKey: 'postId', on: 'delete' },
      ];

      await service.deleteMany(ids);

      expect(childModelMock.deleteMany).toHaveBeenCalledTimes(1);
      expect(anotherChildModelMock.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('cascade with a supported transaction (replica set)', () => {
    const cascadeConfig: CascadeConfig = {
      entity: ChildEntity,
      foreignKey: 'parentId',
      on: 'delete',
    };
    let childModelMock: { deleteMany: Mock; updateMany: Mock };
    let sessionMock: { withTransaction: Mock; endSession: Mock };

    beforeEach(() => {
      childModelMock = {
        deleteMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ deletedCount: 3 }) })),
        updateMany: vi.fn(() => ({ exec: vi.fn().mockResolvedValue({ modifiedCount: 3 }) })),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(
        childModelMock as unknown as ReturnType<typeof DynamicApiGlobalStateService.getEntityModel> extends Promise<infer M> ? M : never,
      );

      sessionMock = {
        withTransaction: vi.fn(async (work: () => Promise<void>) => { await work(); }),
        endSession: vi.fn().mockResolvedValue(undefined),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const enableTransactionSupport = () => {
      (modelMock.db as unknown as { startSession: Mock }).startSession = vi.fn().mockResolvedValue(sessionMock);
      (modelMock.db as unknown as { model: Mock }).model = vi.fn().mockReturnValue(childModelMock);
    };

    it('deletes the parents and cascades to children within the same session', async () => {
      service = initService();
      enableTransactionSupport();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      const result = await service.deleteMany(ids);

      expect(result).toStrictEqual(presenter);
      expect(modelMock.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } }, { session: sessionMock });
      expect(modelMock.db.model).toHaveBeenCalledWith(ChildEntity.name);
      expect(childModelMock.deleteMany).toHaveBeenCalledWith(
        { parentId: { $in: ids } },
        { session: sessionMock },
      );
      expect(sessionMock.endSession).toHaveBeenCalled();
    });

    it('soft-deletes the parents within the same session when isSoftDeletable is true', async () => {
      service = initService();
      enableTransactionSupport();
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete' }];

      await service.deleteMany(ids);

      expect(modelMock.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: expect.any(Number) } },
        { session: sessionMock },
      );
    });

    it('ends the session even if the transaction throws', async () => {
      service = initService();
      enableTransactionSupport();
      sessionMock.withTransaction.mockRejectedValueOnce(new Error('unexpected failure'));
      vi.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(
        plainToInstance(DeletePresenter, { deletedCount: 0 }),
      );

      expect(sessionMock.endSession).toHaveBeenCalled();
    });
  });
});
