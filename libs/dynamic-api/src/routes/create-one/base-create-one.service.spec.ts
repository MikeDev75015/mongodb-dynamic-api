import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveCallback,
  AfterSaveCallback,
  CallbackRetryOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateOneService } from './base-create-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseCreateOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackRetry: CallbackRetryOptions | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseCreateOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const toCreate = { name: 'test' } as Partial<TestEntity>;
  const created = { _id: 'ObjectId', __v: 1, name: 'test' };

  const initService = (document?: object) => {
    modelMock = {
      create: jest.fn().mockResolvedValue(created),
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(document),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have createOne method', () => {
    service = initService();
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
      internal(service).callback = callback;
      await service.createOne(toCreate);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, internal(service).callbackMethods, undefined);
    });

    it('should pass user to callback if it is defined', async () => {
      service = initService(created);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.createOne(toCreate, fakeUser);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ ...created, id: created._id }, internal(service).callbackMethods, fakeUser);
    });

    it('should not throw and should still return the created entity when callback rejects', async () => {
      service = initService(created);
      internal(service).callback = jest.fn(() => Promise.reject(new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = created;

      await expect(service.createOne(toCreate)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: created._id,
      });
    });

    it('should succeed on retry when callbackRetry is configured', async () => {
      service = initService(created);
      const callback = jest.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      internal(service).callback = callback;
      internal(service).callbackRetry = { attempts: 2 };

      await service.createOne(toCreate);

      expect(callback).toHaveBeenCalledTimes(2);
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
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.createOne(toCreate);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        undefined,
        { toCreate },
        internal(service).callbackMethods,
        undefined,
      );
    });

    it('should pass user to beforeSaveCallback if it is defined', async () => {
      service = initService(created);
      const beforeSaveCallback = jest.fn(() => Promise.resolve(toCreate));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      const fakeUser = { id: 'user-1', email: 'test@test.com' };
      await service.createOne(toCreate, fakeUser);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        undefined,
        { toCreate },
        internal(service).callbackMethods,
        fakeUser,
      );
    });

    it('should call applyDerivedFields with "save" trigger after beforeSaveCallback', async () => {
      service = initService(created);
      const applyDerivedFieldsSpy = jest
        .spyOn(service as unknown as { applyDerivedFields: jest.Mock }, 'applyDerivedFields')
        .mockImplementation((p) => p);

      await service.createOne(toCreate);

      expect(applyDerivedFieldsSpy).toHaveBeenCalledWith(toCreate, 'save');
    });

    it('should apply applyDerivedFields result to the entity persisted', async () => {
      service = initService(created);
      const withDerived = { ...toCreate, slug: 'test-slug' };
      jest
        .spyOn(service as unknown as { applyDerivedFields: jest.Mock }, 'applyDerivedFields')
        .mockReturnValue(withDerived);

      await service.createOne(toCreate);

      expect(modelMock.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'test-slug' }));
    });
  });
});
