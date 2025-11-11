import { Model } from 'mongoose';
import { BaseDuplicateOneService } from './base-duplicate-one.service';

class TestService extends BaseDuplicateOneService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseDuplicateOneService', () => {
  let service: any;
  let modelMock: Model<any>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const duplicatedDocument = {
    ...document,
    _id: 'NewObjectId',
    __v: 1,
    name: 'test',
  };

  const initService = (exec = jest.fn(), document: any = undefined) => {
    modelMock = {
      findOne: jest.fn(() => (
        {
          lean: jest.fn(() => (
            { exec }
          )),
        }
      )),
      create: jest.fn(() => Promise.resolve(document)),
    } as any;

    return new TestService(modelMock);
  };

  it('should have duplicateOne method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateOne');
  });

  describe('duplicateOne', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateOne(document._id)).rejects.toThrow(
        'Document not found',
      );
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      const exec = jest.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = duplicatedDocument;

      await expect(service.duplicateOne(document._id)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: duplicatedDocument._id,
      });

      expect(modelMock.findOne).toHaveBeenNthCalledWith(1, {
        _id: document._id,
      });
      expect(modelMock.findOne).toHaveBeenNthCalledWith(2, {
        _id: duplicatedDocument._id,
      });
      expect(modelMock.create).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.duplicateOne(document._id);

      expect(callback)
      .toHaveBeenCalledWith({ ...duplicatedDocument, id: duplicatedDocument._id }, service.callbackMethods);
    });
  });
});
