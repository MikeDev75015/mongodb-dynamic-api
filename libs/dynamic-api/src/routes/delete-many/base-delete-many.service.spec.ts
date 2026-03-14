import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { BaseEntity } from '../../models';
import { BaseDeleteManyService } from './base-delete-many.service';

describe('BaseDeleteManyService', () => {
  let service: BaseDeleteManyService<BaseEntity>;
  let modelMock: Model<BaseEntity>;
  let presenter: DeletePresenter;

  const ids = ['ObjectId1', 'ObjectId2'];
  const deleted = { deletedCount: 2 };

  const initService = () => {
    modelMock = {
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
    } as unknown as Model<BaseEntity>;

    class TestService extends BaseDeleteManyService<BaseEntity> {
      constructor(protected readonly _: Model<BaseEntity>) {
        super(_);
      }
    }

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
});
