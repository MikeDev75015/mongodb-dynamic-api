import { Model } from 'mongoose';
import { BaseCreateManyService } from './base-create-many.service';

describe('BaseCreateManyService', () => {
  let service: any;
  let modelMock: Model<any>;

  const toCreate = { name: 'test' };
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (documents: any[] = []) => {
    modelMock = {
      create: jest.fn().mockResolvedValue([created]),
      find: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(documents),
    } as unknown as Model<any>;

    class TestService extends BaseCreateManyService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    return new TestService(modelMock);
  }

  it('should have createMany method', () => {
    const service = initService();
    expect(service).toHaveProperty('createMany');
  });

  describe('createMany', () => {
    it('should return created list with id defined', async () => {
      service = initService([created]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createMany([toCreate])).resolves.toStrictEqual([{
        ...documentWithoutIdAndVersion,
        id: created._id,
      }]);
    });

    it('should call callback if it is defined', async () => {
      service = initService([created]);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.createMany([toCreate]);

      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, service.callbackMethods);
    });

    it('should throw an error if the document already exists', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue({
        code: 11000,
        keyValue: { name: 'test' },
      });

      await expect(service.createMany([toCreate])).rejects.toThrow(
        "name 'test' is already used",
      );
    });

    it('should throw an error if the create query fails', async () => {
      service = initService();
      (modelMock.create as jest.Mock).mockRejectedValue(new Error('create error'));

      await expect(service.createMany([toCreate])).rejects.toThrow('create error');
    });
  });
});
