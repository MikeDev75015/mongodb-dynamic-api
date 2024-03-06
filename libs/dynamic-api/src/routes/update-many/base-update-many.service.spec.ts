import { DeepMocked } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseUpdateManyService } from './base-update-many.service';

class TestService extends BaseUpdateManyService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseUpdateManyService', () => {
  let service: any;
  let modelMock: DeepMocked<Model<any>>;

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

  it('should have updateMany method', () => {
    modelMock = buildModelMock();
    service = new TestService(modelMock);

    expect(service).toHaveProperty('updateMany');
  });

  describe('updateMany', () => {
    it('should throw an error if one of the documents to update does not exist', async () => {
      modelMock = buildModelMock({
        find: [[{ _id: 'ObjectId', __v: 1, name: 'test' }]],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateMany(ids, { name: 'replaced' }),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndUpdate and return the new document', async () => {
      modelMock = buildModelMock({
        find: [updatedDocuments],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(
        service.updateMany(ids, { name: 'updated' }),
      ).resolves.toStrictEqual(updatedDocuments.map(({ _id, name }) => ({
        name,
        id: _id,
      })));

      expect(modelMock.find).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });

      expect(modelMock.updateMany).toHaveBeenCalledWith(
        {
          _id: { $in: ids },
        },
        { name: 'updated' },
      );

      expect(modelMock.find).toHaveBeenNthCalledWith(2, { _id: { $in: ids } });
    });
  });
});
