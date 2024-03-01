import { DeepMocked } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseUpdateOneService } from './base-update-one.service';

class TestService extends BaseUpdateOneService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseUpdateOneService', () => {
  let service: any;
  let modelMock: DeepMocked<Model<any>>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const updatedDocument = {
    ...document,
    _id: 'UpdatedObjectId',
    __v: 1,
    name: 'updated',
  };

  it('should have updateOne method', () => {
    modelMock = buildModelMock();
    service = new TestService(modelMock);

    expect(service).toHaveProperty('updateOne');
  });

  describe('updateOne', () => {
    it('should throw an error if the document to update does not exist', async () => {
      modelMock = buildModelMock({
        findOneAndUpdate: [undefined],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateOne(document._id, { name: 'replaced' }),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndUpdate and return the new document', async () => {
      modelMock = buildModelMock({
        findOneAndUpdate: [updatedDocument],
      });
      service = new TestService(modelMock);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = updatedDocument;

      await expect(
        service.updateOne(document._id, { name: updatedDocument.name }),
      ).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: updatedDocument._id,
      });

      expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: document._id,
        },
        { name: updatedDocument.name },
        { new: true },
      );
    });
  });
});
