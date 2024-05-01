import { Model } from 'mongoose';
import { BaseDuplicateManyService } from './base-duplicate-many.service';

class TestService extends BaseDuplicateManyService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseDuplicateManyService', () => {
  let service: any;
  let modelMock: Model<any>;

  const ids = ['ObjectId1', 'ObjectId2'];
  const documents = [{ _id: 'ObjectId1', __v: 1, name: 'test 1' }, { _id: 'ObjectId2', __v: 1, name: 'test 2' }];
  const duplicatedDocuments = [
    {
      ...documents[0],
      _id: 'NewObjectId1',
      __v: 1,
      name: 'test 1',
    },
    {
      ...documents[1],
      _id: 'NewObjectId2',
      __v: 1,
      name: 'test 2',
    },
  ];

  const initService = (exec = jest.fn(), documents: any[] = []) => {
    modelMock = {
      find: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
      create: jest.fn(() => Promise.resolve(documents)),
    } as any;

    return new TestService(modelMock);
  }

  it('should have duplicateMany method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateMany');
  });

  describe('duplicateMany', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateMany(ids)).rejects.toThrow(
        'Document not found',
      );
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.duplicateMany(ids))
      .resolves
      .toStrictEqual(duplicatedDocuments.map(({ _id: id, name }) => (
        { name, id }
      )));

      expect(modelMock.find).toHaveBeenNthCalledWith(1, {
        _id: { $in: ids },
      });
      expect(modelMock.find).toHaveBeenNthCalledWith(2, {
        _id: { $in: duplicatedDocuments.map(({ _id }) => _id) },
      });
      expect(modelMock.create).toHaveBeenCalledWith([{ name: 'test 1' }, { name: 'test 2' }]);
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;

      await service.duplicateMany(ids);

      expect(callback).toHaveBeenNthCalledWith(1, duplicatedDocuments[0], service.callbackMethods);
      expect(callback).toHaveBeenNthCalledWith(2, duplicatedDocuments[1], service.callbackMethods);
    });
  });
});
