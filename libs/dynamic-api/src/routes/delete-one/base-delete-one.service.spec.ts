import { Builder } from 'builder-pattern';
import { Model } from 'mongoose';
import { DeletePresenter } from '../../dtos';
import { BaseDeleteOneService } from './base-delete-one.service';

describe('BaseDeleteOneService', () => {
  let service: any;
  let modelMock: Model<any>;
  const id = 'ObjectId';
  const deleted = { deletedCount: 1 };
  let presenter: DeletePresenter;

  const initService = () => {
    modelMock = {
      deleteOne: jest.fn(() => ({
        exec: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
      })),
      updateOne: jest.fn(() => ({
        exec: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
      })),
    } as any;

    class TestService extends BaseDeleteOneService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    return new TestService(modelMock);
  }

  beforeEach(() => {
    presenter = Builder(DeletePresenter, deleted).build();
  });

  it('should have deleteOne method', () => {
    service = initService();
    expect(service).toHaveProperty('deleteOne');
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
      } as any);

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
      } as any);
      presenter.deletedCount = 0;

      await expect(service.deleteOne(id)).resolves.toStrictEqual(presenter);
    });
  });
});
