import { Model } from 'mongoose';
import { DynamicApiCallbackMethods, DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateOneService } from './base-duplicate-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseDuplicateOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: DynamicApiServiceCallback<TestEntity> | undefined;
  callbackMethods: DynamicApiCallbackMethods;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseDuplicateOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const duplicatedDocument = { ...document, _id: 'NewObjectId' };

  const initService = (exec = jest.fn(), created: object | undefined = undefined) => {
    modelMock = {
      findOne: jest.fn(() => ({ lean: jest.fn(() => ({ exec })) })),
      create: jest.fn(() => Promise.resolve(created)),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have duplicateOne method', () => {
    service = initService();
    expect(service).toHaveProperty('duplicateOne');
  });

  describe('duplicateOne', () => {
    it('should throw an error if the document to duplicate does not exist', async () => {
      service = initService();
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(service.duplicateOne(document._id, undefined)).rejects.toThrow('Document not found');
    });

    it('should call model.findOne, model.create and return the duplicated document', async () => {
      const exec = jest.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = duplicatedDocument;

      await expect(service.duplicateOne(document._id, undefined)).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: duplicatedDocument._id,
      });

      expect(modelMock.findOne).toHaveBeenNthCalledWith(1, { _id: document._id });
      expect(modelMock.findOne).toHaveBeenNthCalledWith(2, { _id: duplicatedDocument._id });
      expect(modelMock.create).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should call callback if it is defined', async () => {
      const exec = jest.fn().mockResolvedValueOnce(document).mockResolvedValueOnce(duplicatedDocument);
      service = initService(exec, duplicatedDocument);
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.duplicateOne(document._id, undefined);

      expect(callback).toHaveBeenCalledWith(
        { ...duplicatedDocument, id: duplicatedDocument._id },
        internal(service).callbackMethods,
      );
    });
  });
});
