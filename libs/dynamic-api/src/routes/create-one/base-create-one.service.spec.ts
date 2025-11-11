import { Model } from 'mongoose';
import { BaseCreateOneService } from './base-create-one.service';

describe('BaseCreateOneService', () => {
  let service: any;
  let modelMock: Model<any>;

  const toCreate = { name: 'test' };
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (document?: any) => {
    modelMock = {
      create: jest.fn().mockResolvedValue(created),
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(document),
    } as unknown as Model<any>;

    class TestService extends BaseCreateOneService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    return new TestService(modelMock);
  }

  it('should have createOne method', () => {
    const service = initService();
    expect(service).toHaveProperty('createOne');
  });

  describe('createOne', () => {
    it('should return an instance of the entity with id defined', async () => {
      service = initService(created);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createOne(toCreate)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: created._id,
      });
    });

    it('should call callback if it is defined', async () => {
      service = initService(created);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.createOne(toCreate);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, service.callbackMethods);
    });

    it('should throw an error if the document already exists', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue({
        code: 11000,
        keyValue: { name: 'test' },
      });

      await expect(service.createOne(toCreate)).rejects.toThrow(
        "name 'test' is already used",
      );
    });

    it('should throw an error if the create query fails', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue(new Error('create error'));

      await expect(service.createOne(toCreate)).rejects.toThrow('create error');
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      service = initService(created);
      const beforeSaveCallback = jest.fn(() => Promise.resolve(toCreate));
      service.beforeSaveCallback = beforeSaveCallback;
      await service.createOne(toCreate);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(undefined, { toCreate }, service.callbackMethods);
    });
  });
});
