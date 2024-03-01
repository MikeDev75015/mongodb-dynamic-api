import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseGetManyService } from './base-get-many.service';

describe('BaseGetManyService', () => {
  let service: any;
  const response = [{ _id: 'ObjectId', __v: 1, name: 'test' }];
  const modelMock = buildModelMock({ find: [response] });

  beforeEach(() => {
    class TestService extends BaseGetManyService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    service = new TestService(modelMock);
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
  });

  it('should have getMany method', () => {
    expect(service).toHaveProperty('getMany');
  });

  describe('getMany', () => {
    it('should call model.find and return the response', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      await expect(service.getMany()).resolves.toStrictEqual([
        {
          ...documentWithoutIdAndVersion,
          id: response[0]._id,
        },
      ]);
      expect(modelMock.find).toHaveBeenCalledWith({});
    });

    it('should call model.find with soft deletable query', async () => {
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getMany();
      expect(modelMock.find).toHaveBeenCalledWith({ isDeleted: false });
    });
  });
});
