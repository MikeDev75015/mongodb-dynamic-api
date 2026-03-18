import { Model } from 'mongoose';
import {
  CallbackMethods,
  BeforeSaveListCallback,
  AfterSaveCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateManyService } from './base-duplicate-many.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDuplicateManyService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: AfterSaveCallback<TestEntity> | undefined;
  callbackMethods: CallbackMethods;
  beforeSaveCallback: BeforeSaveListCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDuplicateManyService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const ids = ['ObjectId1', 'ObjectId2'];
  const documents = [
    { _id: 'ObjectId1', __v: 1, name: 'test 1' },
    { _id: 'ObjectId2', __v: 1, name: 'test 2' },
  ];
  const duplicatedDocuments = [
    { ...documents[0], _id: 'NewObjectId1' },
    { ...documents[1], _id: 'NewObjectId2' },
  ];

  const initService = (exec = jest.fn(), created: object[] = []) => {
    modelMock = {
      find: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
      create: jest.fn(() => Promise.resolve(created)),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have duplicateMany method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateMany');
  });

  describe('duplicateMany', () => {
    it('should throw an error if documents to duplicate do not exist', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateMany(ids, undefined)).rejects.toThrow('Document not found');
    });

    it('should call model.find, model.create and return the duplicated documents', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      await expect(service.duplicateMany(ids, undefined)).resolves.toStrictEqual(
        duplicatedDocuments.map(({ _id: id, name }) => ({ name, id })),
      );

      expect(modelMock.find).toHaveBeenNthCalledWith(1, { _id: { $in: ids } });
      expect(modelMock.find).toHaveBeenNthCalledWith(2, {
        _id: { $in: duplicatedDocuments.map(({ _id }) => _id) },
      });
      expect(modelMock.create).toHaveBeenCalledWith([{ name: 'test 1' }, { name: 'test 2' }]);
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;

      await service.duplicateMany(ids, undefined);

      expect(callback).toHaveBeenNthCalledWith(
        1,
        { ...duplicatedDocuments[0], id: duplicatedDocuments[0]._id },
        internal(service).callbackMethods,
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        { ...duplicatedDocuments[1], id: duplicatedDocuments[1]._id },
        internal(service).callbackMethods,
      );
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce(duplicatedDocuments);
      service = initService(exec, duplicatedDocuments);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn(() => Promise.resolve([{ name: 'test 1' }, { name: 'test 2' }]));
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.duplicateMany(ids, undefined);

      expect(beforeSaveCallback).toHaveBeenCalledTimes(1);
      expect(beforeSaveCallback).toHaveBeenCalledWith(
        documents,
        { ids, override: undefined },
        internal(service).callbackMethods,
      );
    });
  });
});
