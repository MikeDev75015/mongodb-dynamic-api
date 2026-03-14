import { Model } from 'mongoose';
import { DynamicApiCallbackMethods, DynamicApiServiceCallback } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseReplaceOneService } from './base-replace-one.service';

class TestEntity extends BaseEntity {
  name: string;
}

class TestService extends BaseReplaceOneService<TestEntity> {
  constructor(protected readonly _: Model<TestEntity>) {
    super(_);
  }
}

type InternalService = {
  callback: DynamicApiServiceCallback<TestEntity> | undefined;
  callbackMethods: DynamicApiCallbackMethods;
};

const internal = (svc: TestService) => svc as unknown as InternalService;

describe('BaseReplaceOneService', () => {
  let service: TestService;
  let modelMock: Model<TestEntity>;

  const document = { _id: 'ObjectId', __v: 1, name: 'test' };
  const replacedDocument = { ...document, _id: 'ReplacedObjectId', name: 'replaced' };

  const initService = (exec = jest.fn()) => {
    modelMock = {
      findOneAndReplace: jest.fn(() => ({
        lean: jest.fn(() => ({ exec })),
      })),
    } as unknown as Model<TestEntity>;

    return new TestService(modelMock);
  };

  it('should have replaceOne method', () => {
    service = initService();
    expect(service).toHaveProperty('replaceOne');
  });

  describe('replaceOne', () => {
    it('should throw an error if the document to replace does not exist', async () => {
      service = initService(jest.fn().mockResolvedValueOnce(undefined));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);

      await expect(
        service.replaceOne(document._id, { name: 'replaced' } as Partial<TestEntity>),
      ).rejects.toThrow('Document not found');
    });

    it('should call model.findOneAndReplace and return the new document', async () => {
      service = initService(jest.fn().mockResolvedValueOnce(replacedDocument));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = replacedDocument;

      await expect(
        service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>),
      ).resolves.toStrictEqual({ ...documentWithoutIdAndVersion, id: replacedDocument._id });

      expect(modelMock.findOneAndReplace).toHaveBeenCalledWith(
        { _id: document._id },
        { name: replacedDocument.name },
        { new: true, setDefaultsOnInsert: true },
      );
    });

    it('should call callback if it is defined', async () => {
      service = initService(jest.fn().mockResolvedValueOnce(replacedDocument));
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
      const callback = jest.fn(() => Promise.resolve());
      internal(service).callback = callback;
      await service.replaceOne(document._id, { name: replacedDocument.name } as Partial<TestEntity>);

      expect(callback).toHaveBeenCalledWith(
        { ...replacedDocument, id: replacedDocument._id },
        internal(service).callbackMethods,
      );
    });
  });
});
