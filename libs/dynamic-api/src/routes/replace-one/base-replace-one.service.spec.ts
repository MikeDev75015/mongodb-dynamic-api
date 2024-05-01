import { Model } from 'mongoose';
import { BaseReplaceOneService } from './base-replace-one.service';

class TestService extends BaseReplaceOneService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseReplaceOneService', () => {
  let service: any;
  let modelMock: Model<any>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const replacedDocument = {
    ...document,
    _id: 'ReplacedObjectId',
    __v: 1,
    name: 'replaced',
  };

  const initService = (exec = jest.fn()) => {
    modelMock = {
      findOneAndReplace: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
    } as any;

    return new TestService(modelMock);
  }

  it('should have replaceOne method', () => {
    service = initService();
    expect(service).toHaveProperty('replaceOne');
  });

  describe('replaceOne', () => {
    it('should throw an error if the document to replace does not exist', async () => {
      const exec = jest.fn().mockResolvedValueOnce(undefined);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.replaceOne(document._id, { name: 'replaced' }),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndReplace and return the new document', async () => {
      service = initService(jest.fn().mockResolvedValueOnce(replacedDocument));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = replacedDocument;

      await expect(
        service.replaceOne(document._id, { name: replacedDocument.name }),
      ).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: replacedDocument._id,
      });

      expect(modelMock.findOneAndReplace).toHaveBeenCalledWith(
        {
          _id: document._id,
        },
        { name: replacedDocument.name },
        { new: true, setDefaultsOnInsert: true },
      );
    });

    it('should call callback if it is defined', async () => {
      service = initService(jest.fn().mockResolvedValueOnce(replacedDocument));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.replaceOne(document._id, { name: replacedDocument.name });

      expect(callback).toHaveBeenCalledWith(replacedDocument, service.callbackMethods);
    });
  });
});
