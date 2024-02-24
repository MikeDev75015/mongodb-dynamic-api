import { BaseReplaceOneService } from '@dynamic-api';
import { DeepMocked } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../../../test/__mocks__/model.mock';

class TestService extends BaseReplaceOneService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseReplaceOneService', () => {
  let service: any;
  let modelMock: DeepMocked<Model<any>>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const replacedDocument = {
    ...document,
    _id: 'ReplacedObjectId',
    __v: 1,
    name: 'replaced',
  };

  it('should have replaceOne method', () => {
    modelMock = buildModelMock();
    service = new TestService(modelMock);

    expect(service).toHaveProperty('replaceOne');
  });

  describe('replaceOne', () => {
    it('should throw an error if the document to replace does not exist', async () => {
      modelMock = buildModelMock({
        findOneAndReplace: [undefined],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.replaceOne(document._id, { name: 'replaced' }),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndReplace and return the new document', async () => {
      modelMock = buildModelMock({
        findOneAndReplace: [replacedDocument],
      });
      service = new TestService(modelMock);
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
  });
});
