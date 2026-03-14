import { Model } from 'mongoose';
import {
  DynamicApiCallbackMethods,
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceCallback,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateOneService } from './base-update-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseUpdateOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: DynamicApiServiceCallback<TestEntity> | undefined;
  callbackMethods: DynamicApiCallbackMethods;
  beforeSaveCallback: DynamicApiServiceBeforeSaveCallback<TestEntity> | undefined;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseUpdateOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const updatedDocument = { ...document, _id: 'UpdatedObjectId', name: 'updated' };

  const initService = (exec = jest.fn(), findOneExec = jest.fn()) => {
    modelMock = {
      findOne: jest.fn(() => ({ lean: jest.fn(() => ({ exec: findOneExec })) })),
      findOneAndUpdate: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have updateOne method', () => {
    service = initService();
    expect(service).toHaveProperty('updateOne');
  });

  describe('updateOne', () => {
    it('should throw an error if the document to update does not exist', async () => {
      service = initService(jest.fn(), jest.fn().mockResolvedValueOnce(undefined));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.updateOne(document._id, { name: 'replaced' } as Partial<TestEntity>),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndUpdate and return the new document', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = updatedDocument;

      await expect(
        service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: updatedDocument._id });

      expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: document._id },
        { $set: { name: updatedDocument.name } },
        { new: true },
      );
    });

    it('should call callback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledWith(
        { ...updatedDocument, id: updatedDocument._id },
        internal(service).callbackMethods,
      );
    });

    it('should call beforeSaveCallback if it is defined', async () => {
      service = initService(
        jest.fn().mockResolvedValueOnce(updatedDocument),
        jest.fn().mockResolvedValueOnce(document),
      );
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const beforeSaveCallback = jest.fn().mockResolvedValue({}) as DynamicApiServiceBeforeSaveCallback<TestEntity>;
      internal(service).beforeSaveCallback = beforeSaveCallback;
      await service.updateOne(document._id, { name: updatedDocument.name } as Partial<TestEntity>);

      expect(beforeSaveCallback).toHaveBeenCalledWith(
        { ...document, id: document._id },
        { id: document._id, update: { name: updatedDocument.name } },
        internal(service).callbackMethods,
      );
    });
  });
});
