import { DeepMocked } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseDuplicateManyService } from './base-duplicate-many.service';

class TestService extends BaseDuplicateManyService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseDuplicateManyService', () => {
  let service: any;
  let modelMock: DeepMocked<Model<any>>;

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

  it('should have duplicateMany method', () => {
    modelMock = buildModelMock();
    service = new TestService(modelMock);

    expect(service).toHaveProperty('duplicateMany');
  });

  describe('duplicateMany', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      modelMock = buildModelMock({
        find: [[]],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateMany(ids)).rejects.toThrow(
        'Document not found',
      );
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      modelMock = buildModelMock({
        find: [documents, duplicatedDocuments],
        create: [duplicatedDocuments],
      });
      service = new TestService(modelMock);
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
  });
});
