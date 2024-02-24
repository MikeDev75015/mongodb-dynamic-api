import { BaseDuplicateOneService } from '@dynamic-api';
import { DeepMocked } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';

class TestService extends BaseDuplicateOneService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseDuplicateOneService', () => {
  let service: any;
  let modelMock: DeepMocked<Model<any>>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const duplicatedDocument = {
    ...document,
    _id: 'NewObjectId',
    __v: 1,
    name: 'test',
  };

  it('should have duplicateOne method', () => {
    modelMock = buildModelMock();
    service = new TestService(modelMock);

    expect(service).toHaveProperty('duplicateOne');
  });

  describe('duplicateOne', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      modelMock = buildModelMock({
        findOne: [undefined],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateOne(document._id)).rejects.toThrow(
        'Document not found',
      );
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      modelMock = buildModelMock({
        findOne: [document, duplicatedDocument],
        create: [duplicatedDocument],
      });
      service = new TestService(modelMock);
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
  });
});
