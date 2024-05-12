import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { BaseDeleteManyService } from './base-delete-many.service';

describe('BaseDeleteManyService', () => {
  let service: any;
  let modelMock: Model<any>;
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
    } as unknown as Model<any>;

    class TestService extends BaseDeleteManyService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    return new TestService(modelMock);
  }

  beforeEach(() => {
    presenter = Builder(DeletePresenter, deleted).build();
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
    } as any);
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
      } as any);

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
      } as any);
      presenter.deletedCount = 0;

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
    });
  });
});
