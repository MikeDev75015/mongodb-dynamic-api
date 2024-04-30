import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseCreateManyService } from './base-create-many.service';

describe('BaseCreateManyService', () => {
  let service: any;
  const toCreate = { name: 'test' };
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };
  const modelMock = buildModelMock({ create: [[created]], find: [[created]] });

  beforeEach(() => {
    class TestService extends BaseCreateManyService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    service = new TestService(modelMock);
  });

  it('should have createMany method', () => {
    expect(service).toHaveProperty('createMany');
  });

  describe('createMany', () => {
    it('should return created list with id defined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createMany([toCreate])).resolves.toStrictEqual([{
        ...documentWithoutIdAndVersion,
        id: created._id,
      }]);
    });

    it('should call callback if it is defined', async () => {
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.createMany([toCreate]);

      expect(callback).toHaveBeenCalledWith(created, modelMock);
    });

    it('should throw an error if the document already exists', async () => {
      modelMock.create.mockRejectedValue({
        code: 11000,
        keyValue: { name: 'test' },
      });

      await expect(service.createMany([toCreate])).rejects.toThrow(
        "name 'test' is already used",
      );
    });

    it('should throw an error if the create query fails', async () => {
      modelMock.create.mockRejectedValue(new Error('create error'));

      await expect(service.createMany([toCreate])).rejects.toThrow('create error');
    });
  });
});
