import { Model } from 'mongoose';
import { BaseGetManyService } from './base-get-many.service';

class TestService extends BaseGetManyService<any> {
  constructor(protected readonly _: Model<any>) {
    super(_);
  }
}

describe('BaseGetManyService', () => {
  let service: any;
  let modelMock: Model<any>;

  const response = [{ _id: 'ObjectId', __v: 1, name: 'test' }];

  const initService = (exec = jest.fn()) => {
    modelMock = {
      find: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
    } as any;

    return new TestService(modelMock);
  }

  it('should have getMany method', () => {
    service = initService();
    expect(service).toHaveProperty('getMany');
  });

  describe('getMany', () => {
    it('should call model.find and return the response', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
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
      const exec = jest.fn().mockResolvedValueOnce([]);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getMany();
      expect(modelMock.find).toHaveBeenCalledWith({ isDeleted: false });
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      service.callback = callback;
      await service.getMany();

      expect(callback).toHaveBeenCalledWith(response[0], service.callbackMethods);
    });
  });
});
