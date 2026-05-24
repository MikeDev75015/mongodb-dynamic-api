import { Model } from 'mongoose';
import { CallbackMethods, AfterSaveCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseGetManyService } from './base-get-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseGetManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackMethods: CallbackMethods;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseGetManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const response = [{ _id: 'ObjectId', __v: 1, name: 'test' }];

  const initService = (exec = jest.fn()) => {
    modelMock = {
      find: jest.fn(() => ({
        lean: jest.fn(() => ({ exec })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

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
        { ...documentWithoutIdAndVersion, id: response[0]._id },
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
      internal(service).callback = callback;
      const user = { id: 'userId' };
      await service.getMany(undefined, user);

      expect(callback).toHaveBeenCalledWith({ ...response[0], id: response[0]._id }, internal(service).callbackMethods, user);
    });

    it('should filter documents when predicateBehavior is filter and abilityPredicate rejects some', async () => {
      const documents = [
        { _id: 'id1', __v: 1, name: 'allowed' },
        { _id: 'id2', __v: 1, name: 'denied' },
      ];
      const exec = jest.fn().mockResolvedValueOnce(documents);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: (entity: TestEntity) => entity.name === 'allowed', configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });
      const user = { id: 'userId' };

      const result = await service.getMany(undefined, user);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('allowed');
    });

    it('should return empty array when predicateBehavior is filter and abilityPredicate rejects all', async () => {
      const documents = [{ _id: 'id1', __v: 1, name: 'denied' }];
      const exec = jest.fn().mockResolvedValueOnce(documents);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });

      const result = await service.getMany();

      expect(result).toEqual([]);
    });

    it('should return all documents when predicateBehavior is filter and abilityPredicate allows all', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => true, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'filter', configurable: true });
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      const result = await service.getMany();

      expect(result).toStrictEqual([{ ...documentWithoutIdAndVersion, id: response[0]._id }]);
    });

    it('should not filter when predicateBehavior is throw (default behavior)', async () => {
      const exec = jest.fn().mockResolvedValueOnce(response);
      service = initService(exec);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      Object.defineProperty(service, 'abilityPredicate', { value: () => false, configurable: true });
      Object.defineProperty(service, 'predicateBehavior', { value: 'throw', configurable: true });
      const { _id, __v, ...documentWithoutIdAndVersion } = response[0];

      // predicateBehavior 'throw' means guard handles it — service just returns all
      const result = await service.getMany();

      expect(result).toStrictEqual([{ ...documentWithoutIdAndVersion, id: response[0]._id }]);
    });
  });
});
