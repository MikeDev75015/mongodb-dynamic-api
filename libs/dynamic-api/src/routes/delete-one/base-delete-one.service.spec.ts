import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import {
  CallbackMethods,
  BeforeSaveDeleteCallback,
  BeforeDeleteCallback,
  BeforeSaveDeleteContext,
  AfterSaveCallback,
  CallbackRetryOptions,
  CascadeConfig,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { BaseDeleteOneService } from './base-delete-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class ChildEntity extends BaseEntity {
  parentId: string;
}

class TestService extends BaseDeleteOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveDeleteCallback<TestEntity> | undefined;
  beforeDeleteCallback: BeforeDeleteCallback<TestEntity, BeforeSaveDeleteContext> | undefined;
  cascade: CascadeConfig[] | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDeleteOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;
  const id = 'ObjectId';
  const document = { _id: id, __v: 1, name: 'test' };
  const deleted = { deletedCount: 1 };
  let presenter: DeletePresenter;

  // Standalone-MongoDB-shaped error: model.db.startSession() rejecting this way is exactly what
  // deleteWithCascade's isTransactionsUnsupportedError check is designed to catch and fall back on.
  const transactionsUnsupportedError = Object.assign(
    new Error('Transaction numbers are only allowed on a replica set member or mongos'),
    { code: 20 },
  );

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
      db: {
        startSession: jest.fn().mockRejectedValue(transactionsUnsupportedError),
      },
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
      undefined,
    );
  });

  it('should pass user to callback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = jest.fn(() => Promise.resolve());
    internal(service).callback = callback;
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    await service.deleteOne(id, fakeUser);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      { ...document, id: document._id },
      internal(service).callbackMethods,
      fakeUser,
    );
  });

  it('should return the real deletedCount (not 0) when callback rejects — masking bug fix', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    internal(service).callback = jest.fn(() => Promise.reject(new Error('boom')));

    await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
    expect(presenter.deletedCount).toBe(1);
  });

  it('should succeed on retry when callbackRetry is configured', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const callback = jest.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    internal(service).callback = callback;
    internal(service).callbackRetry = { attempts: 2 };

    await service.deleteOne(id);

    expect(callback).toHaveBeenCalledTimes(2);
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
      undefined,
    );
  });

  it('should pass user to beforeSaveCallback if it is defined', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = jest.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    await service.deleteOne(id, fakeUser);

    expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
    expect(beforeSaveCallback).toHaveBeenCalledWith(
      { ...document, id: document._id },
      { id },
      internal(service).callbackMethods,
      fakeUser,
    );
  });

  it('should propagate exception thrown by beforeSaveCallback (fix: no longer swallowed)', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const error = new BadRequestException('blocked by beforeSaveCallback');
    internal(service).beforeSaveCallback = jest.fn(() => Promise.reject(error));

    await expect(service.deleteOne(id)).rejects.toThrow(BadRequestException);
    expect(modelMock.deleteOne).not.toHaveBeenCalled();
  });

  it('should call beforeSaveCallback with undefined entity when document not found', async () => {
    service = initService(null);
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeSaveCallback = jest.fn(() => Promise.resolve());
    internal(service).beforeSaveCallback = beforeSaveCallback;
    await service.deleteOne(id);

    expect(beforeSaveCallback).toHaveBeenCalledWith(
      undefined,
      { id },
      internal(service).callbackMethods,
      undefined,
    );
  });

  it('should include isDeleted filter in pre-hook findOne when soft-deletable', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (modelMock.updateOne as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 1 }) });
    const beforeDeleteCallback = jest.fn(() => Promise.resolve());
    internal(service).beforeDeleteCallback = beforeDeleteCallback;
    await service.deleteOne(id);

    expect(modelMock.findOne).toHaveBeenCalledWith({ _id: id, isDeleted: false });
  });

  it('should skip second findOne when document already loaded by hook and callback is set', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
    const beforeDeleteCallback = jest.fn(() => Promise.resolve());
    const callback = jest.fn(() => Promise.resolve());
    internal(service).beforeDeleteCallback = beforeDeleteCallback;
    internal(service).callback = callback;
    await service.deleteOne(id);

    // findOne called once (pre-hook), NOT a second time inside try
    expect(modelMock.findOne).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should include isDeleted filter in inner findOne for callback when soft-deletable and no hooks set', async () => {
    service = initService();
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
    (modelMock.updateOne as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ modifiedCount: 1 }) });
    const callback = jest.fn(() => Promise.resolve());
    internal(service).callback = callback;
    await service.deleteOne(id);

    expect(modelMock.findOne).toHaveBeenCalledWith({ _id: id, isDeleted: false });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  describe('beforeDeleteCallback', () => {
    it('should call beforeDeleteCallback before the delete', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = jest.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      await service.deleteOne(id);

      expect(beforeDeleteCallback).toHaveBeenCalledTimes(1);
      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id },
        internal(service).callbackMethods,
        undefined,
      );
      expect(modelMock.deleteOne).toHaveBeenCalledTimes(1);
    });

    it('should pass user to beforeDeleteCallback', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = jest.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.deleteOne(id, fakeUser);

      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should propagate exception and abort delete when beforeDeleteCallback throws', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const error = new BadRequestException('forbidden');
      internal(service).beforeDeleteCallback = jest.fn(() => Promise.reject(error));

      await expect(service.deleteOne(id)).rejects.toThrow(BadRequestException);
      expect(modelMock.deleteOne).not.toHaveBeenCalled();
    });

    it('should call beforeDeleteCallback with undefined entity when document not found', async () => {
      service = initService(null);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeDeleteCallback = jest.fn(() => Promise.resolve());
      internal(service).beforeDeleteCallback = beforeDeleteCallback;
      await service.deleteOne(id);

      expect(beforeDeleteCallback).toHaveBeenCalledWith(
        undefined,
        { id },
        internal(service).callbackMethods,
        undefined,
      );
    });
  });

  describe('cascade', () => {
    let childModelMock: { deleteMany: jest.Mock; updateMany: jest.Mock };
    const cascadeConfig: CascadeConfig = {
      entity: ChildEntity,
      foreignKey: 'parentId',
      on: 'delete',
    };

    beforeEach(() => {
      childModelMock = {
        deleteMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ deletedCount: 2 }) })),
        updateMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }) })),
      };
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(
        childModelMock as unknown as ReturnType<typeof DynamicApiGlobalStateService.getEntityModel> extends Promise<infer M> ? M : never,
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should hard-delete children when on=delete and parent is hard-deleted', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      await service.deleteOne(id);

      expect(childModelMock.deleteMany).toHaveBeenCalledWith({ parentId: { $in: [id] } });
    });

    it('should not cascade when on=delete and parent is soft-deleted', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 1 }),
      });
      internal(service).cascade = [cascadeConfig];

      await service.deleteOne(id);

      expect(childModelMock.deleteMany).not.toHaveBeenCalled();
    });

    it('should soft-delete children when on=softDelete and parent is soft-deleted', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 1 }),
      });
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete' }];

      await service.deleteOne(id);

      expect(childModelMock.updateMany).toHaveBeenCalledWith(
        { parentId: { $in: [id] } },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
    });

    it('should hard-delete children with softDelete:false override even when parent is soft-deleted', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      (modelMock.updateOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 1 }),
      });
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete', softDelete: false }];

      await service.deleteOne(id);

      expect(childModelMock.deleteMany).toHaveBeenCalledWith({ parentId: { $in: [id] } });
    });

    it('should soft-delete children with softDelete:true override even when parent is hard-deleted', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [{ ...cascadeConfig, softDelete: true }];

      await service.deleteOne(id);

      expect(childModelMock.updateMany).toHaveBeenCalledWith(
        { parentId: { $in: [id] } },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
    });

    it('should not execute cascade when deletedCount is 0', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      (modelMock.deleteOne as jest.Mock).mockReturnValueOnce({
        exec: () => Promise.resolve({ deletedCount: 0 }),
      });
      internal(service).cascade = [cascadeConfig];

      await service.deleteOne(id);

      expect(childModelMock.deleteMany).not.toHaveBeenCalled();
    });

    it('should execute multiple cascade configs', async () => {
      class AnotherChild extends BaseEntity { postId: string; }
      const anotherChildModelMock = {
        deleteMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) })),
        updateMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) })),
      };
      (DynamicApiGlobalStateService.getEntityModel as jest.Mock)
        .mockResolvedValueOnce(childModelMock)
        .mockResolvedValueOnce(anotherChildModelMock);

      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [
        cascadeConfig,
        { entity: AnotherChild, foreignKey: 'postId', on: 'delete' },
      ];

      await service.deleteOne(id);

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
    let childModelMock: { deleteMany: jest.Mock; updateMany: jest.Mock };
    let sessionMock: { withTransaction: jest.Mock; endSession: jest.Mock };

    beforeEach(() => {
      childModelMock = {
        deleteMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ deletedCount: 2 }) })),
        updateMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }) })),
      };
      // A session-bound cascade write resolves the child model via this.model.db.model(...) —
      // NOT DynamicApiGlobalStateService.getEntityModel, which lives on a separate connection a
      // session can't span. See base.service.ts's executeCascade for why.
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(
        childModelMock as unknown as ReturnType<typeof DynamicApiGlobalStateService.getEntityModel> extends Promise<infer M> ? M : never,
      );

      sessionMock = {
        withTransaction: jest.fn(async (work: () => Promise<void>) => { await work(); }),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const enableTransactionSupport = () => {
      (modelMock.db as unknown as { startSession: jest.Mock }).startSession = jest.fn().mockResolvedValue(sessionMock);
      (modelMock.db as unknown as { model: jest.Mock }).model = jest.fn().mockReturnValue(childModelMock);
    };

    it('deletes the parent and cascades to children within the same session', async () => {
      service = initService();
      enableTransactionSupport();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      const result = await service.deleteOne(id);

      expect(result).toStrictEqual(presenter);
      expect(modelMock.deleteOne).toHaveBeenCalledWith({ _id: id }, { session: sessionMock });
      expect(modelMock.db.model).toHaveBeenCalledWith(ChildEntity.name);
      expect(childModelMock.deleteMany).toHaveBeenCalledWith(
        { parentId: { $in: [id] } },
        { session: sessionMock },
      );
      expect(sessionMock.endSession).toHaveBeenCalled();
    });

    it('soft-deletes the parent within the same session when isSoftDeletable is true', async () => {
      service = initService();
      enableTransactionSupport();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      internal(service).cascade = [{ ...cascadeConfig, on: 'softDelete' }];

      await service.deleteOne(id);

      expect(modelMock.updateOne).toHaveBeenCalledWith(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: expect.any(Number) } },
        { session: sessionMock },
      );
    });

    it('ends the session even if the transaction throws', async () => {
      service = initService();
      enableTransactionSupport();
      sessionMock.withTransaction.mockRejectedValueOnce(new Error('unexpected failure'));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      internal(service).cascade = [cascadeConfig];

      await expect(service.deleteOne(id)).resolves.toStrictEqual(
        plainToInstance(DeletePresenter, { deletedCount: 0 }),
      );

      expect(sessionMock.endSession).toHaveBeenCalled();
    });
  });
});
