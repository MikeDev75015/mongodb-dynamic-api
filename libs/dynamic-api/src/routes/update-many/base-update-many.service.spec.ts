import { Model } from 'mongoose';
import { BaseUpdateManyService } from './base-update-many.service';

class TestService extends BaseUpdateManyService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseUpdateManyService', () => {
  let service: any;
  let modelMock: Model<any>;

  const ids = ['ObjectId', 'ObjectId2'];
  const documents = [{ _id: 'ObjectId', __v: 1, name: 'test' }, { _id: 'ObjectId2', __v: 1, name: 'test2' }];
  const updatedDocuments = [
    {
      ...documents[0],
      _id: 'UpdatedObjectId',
      __v: 1,
      name: 'updated',
    },
    {
      ...documents[1],
      _id: 'UpdatedObjectId2',
      __v: 1,
      name: 'updated',
    },
  ];

  const initService = (exec = jest.fn(), documents: any[] = []) => {
    modelMock = {
      find: jest.fn(() => (
        {
          lean: jest.fn(() => (
            { exec }
          )),
        }
      )),
      updateMany: jest.fn(() => (
        {
          lean: jest.fn(() => (
            {
              exec: jest.fn().mockResolvedValueOnce(documents),
            }
          )),
        }
      )),
    } as any;

    return new TestService(modelMock);
  };

  it('should have updateMany method', () => {
    service = initService();
    expect(service).toHaveProperty('updateMany');
  });

  describe('updateMany', () => {
    it('should throw an error if one of the documents to update does not exist', async () => {
      const exec = jest.fn().mockResolvedValueOnce([documents[0]]);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateMany(ids, { name: 'replaced' }),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndUpdate and return the new document', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(
        service.updateMany(ids, { name: 'updated' }),
      )
      .resolves
      .toStrictEqual(updatedDocuments.map(({ _id, name }) => (
        {
          name,
          id: _id,
        }
      )));

      expect(modelMock.find).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });

      expect(modelMock.updateMany).toHaveBeenCalledWith(
        {
          _id: { $in: ids },
        },
        { name: 'updated' },
      );

      expect(modelMock.find).toHaveBeenNthCalledWith(2, { _id: { $in: ids } });
    });

    it('should call with isDeleted: false if isSoftDeletable is true', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await service.updateMany(ids, { name: 'updated' });

      expect(modelMock.updateMany).toHaveBeenCalledWith(
        {
          _id: { $in: ids },
          isDeleted: false,
        },
        { name: 'updated' },
      );
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(updatedDocuments);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.updateMany(ids, { name: 'updated' });

      expect(callback)
      .toHaveBeenNthCalledWith(1, { ...updatedDocuments[0], id: updatedDocuments[0]._id }, service.callbackMethods);
      expect(callback)
      .toHaveBeenNthCalledWith(2, { ...updatedDocuments[1], id: updatedDocuments[1]._id }, service.callbackMethods);
    });
  });
});
