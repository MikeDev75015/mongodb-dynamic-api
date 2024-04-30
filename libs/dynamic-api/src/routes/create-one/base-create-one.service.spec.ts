import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';
import { BaseCreateOneService } from './base-create-one.service';

describe('BaseCreateOneService', () => {
  let service: any;
  const toCreate = { name: 'test' };
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };
  const modelMock = buildModelMock({ create: [created], findOne: [created] });

  beforeEach(() => {
    class TestService extends BaseCreateOneService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    service = new TestService(modelMock);
  });

  it('should have createOne method', () => {
    expect(service).toHaveProperty('createOne');
  });

  describe('createOne', () => {
    it('should return an instance of the entity with id defined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createOne(toCreate)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: created._id,
      });
    });

    it('should call callback if it is defined', async () => {
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.createOne(toCreate);

      expect(callback).toHaveBeenCalledWith(created, modelMock);
    });

    it('should throw an error if the document already exists', async () => {
      modelMock.create.mockRejectedValue({
        code: 11000,
        keyValue: { name: 'test' },
      });

      await expect(service.createOne(toCreate)).rejects.toThrow(
        "name 'test' is already used",
      );
    });

    it('should throw an error if the create query fails', async () => {
      modelMock.create.mockRejectedValue(new Error('create error'));

      await expect(service.createOne(toCreate)).rejects.toThrow('create error');
    });
  });
});
