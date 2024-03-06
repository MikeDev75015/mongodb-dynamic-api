import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseDeleteManyService } from './base-delete-many.service';
import { DeleteManyPresenter } from './delete-many.presenter';

describe('BaseDeleteOneService', () => {
  let service: any;
  const ids = ['ObjectId1', 'ObjectId2'];
  const deleted = { deletedCount: 2 };
  let presenter: DeleteManyPresenter;
  const modelMock = buildModelMock({
    deleteMany: [deleted]
  });

  beforeEach(() => {
    class TestService extends BaseDeleteManyService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    service = new TestService(modelMock);
    presenter = Builder(DeleteManyPresenter, deleted).build();
  });

  it('should have deleteMany method', () => {
    expect(service).toHaveProperty('deleteMany');
  });

  describe('deleteMany without softDeletable', () => {
    it('should call model.deleteMany and return the number of deleted documents', async () => {
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
      expect(modelMock.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
    });
  });

  describe('deleteMany with softDeletable', () => {
    it('should call model.updateMany and return the number of deleted documents', async () => {
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      modelMock.updateMany.mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 2 }),
      } as any);

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
      expect(modelMock.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: expect.any(Number) } },
      );
    });

    it('should call model.updateMany and return 0 as number of deleted documents', async () => {
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      modelMock.updateMany.mockReturnValueOnce({
        exec: () => Promise.resolve({ modifiedCount: 0 }),
      } as any);
      presenter.deletedCount = 0;

      await expect(service.deleteMany(ids)).resolves.toStrictEqual(presenter);
    });
  });
});
