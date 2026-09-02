import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PipelineStage } from 'mongodb-pipeline-builder';
import { Model, ObjectId } from 'mongoose';
import { AbilityPredicate, AfterSaveCallback, DeleteResult, MongoUpdateOperators, UpdateResult } from '../../interfaces';
import { BaseEntity, SoftDeletableEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';
import { BaseService } from './base.service';

vi.mock('../../dynamic-api.module', () => ({
  DynamicApiModule: { state: { get: vi.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DynamicApiModule } = require('../../dynamic-api.module');

class TestEntity extends BaseEntity {
  name: string;

  password?: string;
}

class TestSoftEntity extends SoftDeletableEntity {
  name: string;
}

class TestService extends BaseService<TestEntity> {
  protected abilityPredicate: AbilityPredicate<TestEntity> | undefined;

  constructor(protected readonly model: Model<TestEntity>) {
    super(model);
  }
}

class TestSoftService extends BaseService<TestSoftEntity> {
  protected abilityPredicate: AbilityPredicate<TestSoftEntity> | undefined;

  constructor(protected readonly model: Model<TestSoftEntity>) {
    super(model);
  }
}

describe('BaseService', () => {
  type FakeModel = {
    aggregate: Mock;
    find: Mock;
    findOne: Mock;
    create: Mock;
    updateOne: Mock;
    updateMany: Mock;
    deleteOne: Mock;
    deleteMany: Mock;
    schema: { paths: Record<string, unknown> };
  };

  let service: TestService;
  let fakeModel: FakeModel;
  let model: Model<TestEntity>;

  const fakeId = 'fake-id';
  const fakeEntity = { _id: fakeId as unknown as ObjectId, name: 'toto' } as TestEntity;
  const expectedEntity = { _id: fakeId as unknown as ObjectId, id: fakeId, name: 'toto' } as TestEntity;
  const fakeQuery = { _id: fakeId };
  const fakeUpdateResult = { modifiedCount: 1 } as UpdateResult;
  const fakeDeleteResult = { deletedCount: 1 } as DeleteResult;
  const exec = vi.fn();

  const documents = [{ _id: '_id1', name: 'toto' }, { _id: '_id2', name: 'unit' }];
  const expectedDocuments = [{ _id: '_id1', id: '_id1', name: 'toto' }, { _id: '_id2', id: '_id2', name: 'unit' }];

  const document = documents[0];
  const expectedDocument = expectedDocuments[0];

  beforeEach(() => {
    const lean = vi.fn(() => (
      { exec }
    ));
    fakeModel = {
      aggregate: vi.fn(() => (
        { exec }
      )),
      find: vi.fn(() => (
        { lean }
      )),
      findOne: vi.fn(() => (
        { lean }
      )),
      create: vi.fn(),
      updateOne: vi.fn(() => (
        { exec }
      )),
      updateMany: vi.fn(() => (
        { exec }
      )),
      deleteOne: vi.fn(() => (
        { exec }
      )),
      deleteMany: vi.fn(() => (
        { exec }
      )),
      schema: {
        paths: {},
      },
    };

    service = new TestService(fakeModel as unknown as Model<TestEntity>);
  });

  describe('callbackMethods', () => {
    it('should have methods', () => {

      expect(service['callbackMethods']).toEqual({
        aggregateDocuments: expect.any(Function),
        findManyDocuments: expect.any(Function),
        findOneDocument: expect.any(Function),
        createManyDocuments: expect.any(Function),
        createOneDocument: expect.any(Function),
        updateManyDocuments: expect.any(Function),
        updateOneDocument: expect.any(Function),
        rawUpdateManyDocuments: expect.any(Function),
        rawUpdateOneDocument: expect.any(Function),
        deleteManyDocuments: expect.any(Function),
        deleteOneDocument: expect.any(Function),
        recomputeDerivedFields: expect.any(Function),
      });
    });
  });

  describe('isSoftDeletable', () => {
    it('should return true if the model has deletedAt and isDeleted properties', () => {
      const model = {
        schema: {
          paths: {
            deletedAt: {},
            isDeleted: {},
          },
        },
      } as unknown as Model<TestSoftEntity>;
      const service = new TestSoftService(model);

      expect(service.isSoftDeletable).toBe(true);
    });

    test.each([
      ['deletedAt and isDeleted properties', {}],
      ['deletedAt property', { isDeleted: {} }],
      ['isDeleted property', { deletedAt: {} }],
    ])('should return false if the model does not have %s', (_, paths) => {
      const model = {
        schema: {
          paths,
        },
      } as unknown as Model<TestEntity>;
      const service = new TestService(model);

      expect(service.isSoftDeletable).toBe(false);
    });
  });

  describe('aggregateDocumentsWithAbilityPredicate', () => {
    beforeEach(() => {
      model = {
        aggregate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(documents),
      } as unknown as Model<TestEntity>;
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model as unknown as Model<unknown>);
    });

    it('should not call handleAbilityPredicate return an array of documents', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;

      const result = await service['aggregateDocumentsWithAbilityPredicate']([]);

      expect(result).toEqual(expectedDocuments);
    });

    it('should call handleAbilityPredicate for each document and return an array of documents', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(true);

      const result = await service['aggregateDocumentsWithAbilityPredicate']([]);

      expect(result).toEqual(expectedDocuments);
      expect(service['abilityPredicate']).toHaveBeenCalledTimes(documents.length);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(false);

      await expect(service['aggregateDocumentsWithAbilityPredicate']([])).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });
  });

  describe('findManyDocumentsWithAbilityPredicate', () => {
    beforeEach(() => {
      model = {
        find: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(documents),
      } as unknown as Model<TestEntity>;
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model as unknown as Model<unknown>);
    });

    it('should not call handleAbilityPredicate return an array of documents', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;

      const result = await service['findManyDocumentsWithAbilityPredicate']();

      expect(result).toEqual(expectedDocuments);
    });

    it('should call handleAbilityPredicate for each document and return an array of documents', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(true);

      const result = await service['findManyDocumentsWithAbilityPredicate']();

      expect(result).toEqual(expectedDocuments);
      expect(service['abilityPredicate']).toHaveBeenCalledTimes(documents.length);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(false);

      await expect(service['findManyDocumentsWithAbilityPredicate']()).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });
  });

  describe('findOneDocumentWithAbilityPredicate', () => {
    beforeEach(() => {
      model = {
        findOne: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(document),
      } as unknown as Model<TestEntity>;
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model as unknown as Model<unknown>);
    });

    it('should not call handleAbilityPredicate return the document', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;

      const result = await service['findOneDocumentWithAbilityPredicate']('id', { test: 'unit' });

      expect(result).toEqual(expectedDocument);
    });

    it('should call handleAbilityPredicate for the document and return the document', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(true);

      const result = await service['findOneDocumentWithAbilityPredicate']('id');

      expect(result).toEqual(expectedDocument);
      expect(service['abilityPredicate']).toHaveBeenCalledTimes(1);
    });

    it('should call handleAbilityPredicate with auth ability predicate', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(true);
      const authAbilityPredicate = vi.fn().mockReturnValue(true);

      const result = await service['findOneDocumentWithAbilityPredicate']('id', undefined, authAbilityPredicate);

      expect(result).toEqual(expectedDocument);
      expect(authAbilityPredicate).toHaveBeenCalledTimes(1);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;
      service['abilityPredicate'] = vi.fn().mockReturnValue(false);

      await expect(service['findOneDocumentWithAbilityPredicate'](undefined)).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });

    it('should throw a BadRequestException if the document is not found', async () => {
      const model = {
        findOne: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      } as unknown as Model<TestEntity>;
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model as unknown as Model<unknown>);
      const service = new TestService(model);
      // @ts-ignore
      service['entity'] = TestEntity;

      await expect(service['findOneDocumentWithAbilityPredicate']('id')).rejects.toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });

  describe('aggregateDocuments', () => {
    it('should call the model aggregate method with the pipeline and return the documents', async () => {
      exec.mockResolvedValue(documents);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].aggregateDocuments(TestEntity, []);

      expect(result).toEqual(expectedDocuments);
      expect(fakeModel.aggregate).toHaveBeenCalledWith([]);
    });

    it('should unwrap a .Paging()-shaped pipeline via GetPagingResult instead of addDocumentId-ing the facet wrapper', async () => {
      // Regression for suggestion #9: the raw facet result ({ docs, count }, no _id of its own)
      // used to be passed straight to addDocumentId, which threw on document._id being undefined.
      fakeModel.aggregate.mockResolvedValueOnce([
        { docs: [document], count: [{ totalElements: 1 }] },
      ]);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);
      const pagingPipeline = [
        { $facet: { docs: [{ $limit: 10 }], count: [{ $count: 'totalElements' }] } },
      ] as unknown as PipelineStage[];

      const result = await service['callbackMethods'].aggregateDocuments(TestEntity, pagingPipeline);

      expect(result).toEqual([expectedDocument]);
    });
  });

  describe('findManyDocuments', () => {
    it('should call the model find method with the query and return the documents', async () => {
      exec.mockResolvedValue(documents);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].findManyDocuments(TestEntity, fakeQuery);

      expect(result).toEqual(expectedDocuments);
      expect(fakeModel.find).toHaveBeenCalledWith(fakeQuery);
    });
  });

  describe('findOneDocument', () => {
    it('should call the model findOne method with the query and return the document', async () => {
      exec.mockResolvedValue(fakeEntity);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].findOneDocument(TestEntity, fakeQuery);

      expect(result).toEqual(expectedEntity);
      expect(fakeModel.findOne).toHaveBeenCalledWith(fakeQuery);
    });
  });

  describe('createManyDocuments', () => {
    it('should call the model create method with the data and return the documents', async () => {
      const data = [{ name: 'toto' }, { name: 'unit' }];
      fakeModel.create.mockResolvedValue(documents);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].createManyDocuments(TestEntity, data);

      expect(result).toEqual(expectedDocuments);
      expect(fakeModel.create).toHaveBeenCalledWith(data);
    });
  });

  describe('createOneDocument', () => {
    it('should call the model create method with the data and return the document', async () => {
      fakeModel.create.mockResolvedValue(fakeEntity);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].createOneDocument(TestEntity, fakeEntity);

      expect(result).toEqual(expectedEntity);
      expect(fakeModel.create).toHaveBeenCalledWith(fakeEntity);
    });
  });

  describe('updateManyDocuments', () => {
    it('should call the model updateMany method with the query and data and return the documents', async () => {
      const data = { name: 'unit' };
      exec.mockResolvedValue(fakeUpdateResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].updateManyDocuments(TestEntity, fakeQuery, data);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateMany).toHaveBeenCalledWith(fakeQuery, data);
    });
  });

  describe('updateOneDocument', () => {
    it('should call the model updateOne method with the query and data and return the document', async () => {
      const data = { name: 'unit' };
      exec.mockResolvedValue(fakeUpdateResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].updateOneDocument(TestEntity, fakeQuery, data);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateOne).toHaveBeenCalledWith(fakeQuery, data);
    });
  });

  describe('rawUpdateManyDocuments', () => {
    const setupService = () => {
      exec.mockResolvedValue(fakeUpdateResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      return new TestService(fakeModel as unknown as Model<TestEntity>);
    };

    it.each<[string, MongoUpdateOperators<TestEntity>]>([
      ['$set',      { $set: { name: 'updated' } }],
      ['$unset',    { $unset: { name: '' } }],
      ['$inc',      { $inc: { name: 1 } as MongoUpdateOperators<TestEntity>['$inc'] }],
      ['$push',     { $push: { name: 'val' } as MongoUpdateOperators<TestEntity>['$push'] }],
      ['$pull',     { $pull: { name: 'val' } as MongoUpdateOperators<TestEntity>['$pull'] }],
      ['$addToSet', { $addToSet: { name: 'val' } as MongoUpdateOperators<TestEntity>['$addToSet'] }],
      ['$pop',      { $pop: { name: 1 } as MongoUpdateOperators<TestEntity>['$pop'] }],
      ['$rename',   { $rename: { name: 'newName' } }],
    ])('should call updateMany with operator %s', async (_, update) => {
      const svc = setupService();

      const result = await svc['callbackMethods'].rawUpdateManyDocuments(TestEntity, fakeQuery, update);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateMany).toHaveBeenCalledWith(fakeQuery, update);
    });

    it('should throw BadRequestException if a key does not start with $', async () => {
      const svc = setupService();

      await expect(
        svc['callbackMethods'].rawUpdateManyDocuments(
          TestEntity,
          fakeQuery,
          { name: 'bad' } as unknown as MongoUpdateOperators<TestEntity>,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException listing all invalid keys', async () => {
      const svc = setupService();

      await expect(
        svc['callbackMethods'].rawUpdateManyDocuments(
          TestEntity,
          fakeQuery,
          { name: 'bad', $set: { name: 'ok' } } as unknown as MongoUpdateOperators<TestEntity>,
        ),
      ).rejects.toThrow('Invalid raw update: all keys must be MongoDB operators starting with "$". Invalid keys: name');
    });
  });

  describe('rawUpdateOneDocument', () => {
    const setupService = () => {
      exec.mockResolvedValue(fakeUpdateResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      return new TestService(fakeModel as unknown as Model<TestEntity>);
    };

    it.each<[string, MongoUpdateOperators<TestEntity>]>([
      ['$set',      { $set: { name: 'updated' } }],
      ['$unset',    { $unset: { name: '' } }],
      ['$inc',      { $inc: { name: 1 } as MongoUpdateOperators<TestEntity>['$inc'] }],
      ['$push',     { $push: { name: 'val' } as MongoUpdateOperators<TestEntity>['$push'] }],
      ['$pull',     { $pull: { name: 'val' } as MongoUpdateOperators<TestEntity>['$pull'] }],
      ['$addToSet', { $addToSet: { name: 'val' } as MongoUpdateOperators<TestEntity>['$addToSet'] }],
      ['$pop',      { $pop: { name: 1 } as MongoUpdateOperators<TestEntity>['$pop'] }],
      ['$rename',   { $rename: { name: 'newName' } }],
    ])('should call updateOne with operator %s', async (_, update) => {
      const svc = setupService();

      const result = await svc['callbackMethods'].rawUpdateOneDocument(TestEntity, fakeQuery, update);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateOne).toHaveBeenCalledWith(fakeQuery, update);
    });

    it('should throw BadRequestException if a key does not start with $', async () => {
      const svc = setupService();

      await expect(
        svc['callbackMethods'].rawUpdateOneDocument(
          TestEntity,
          fakeQuery,
          { name: 'bad' } as unknown as MongoUpdateOperators<TestEntity>,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException listing all invalid keys', async () => {
      const svc = setupService();

      await expect(
        svc['callbackMethods'].rawUpdateOneDocument(
          TestEntity,
          fakeQuery,
          { name: 'bad', $set: { name: 'ok' } } as unknown as MongoUpdateOperators<TestEntity>,
        ),
      ).rejects.toThrow('Invalid raw update: all keys must be MongoDB operators starting with "$". Invalid keys: name');
    });
  });

  describe('updateOneDocument / rawUpdateOneDocument — derived fields auto-recompute', () => {
    class DerivedUpdateEntity extends BaseEntity {
      val: number;
      double: number;
    }
    const doubleFn = (e: Partial<DerivedUpdateEntity>) => (e.val ?? 0) * 2;

    beforeEach(() => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], DerivedUpdateEntity.prototype);
      Reflect.defineMetadata(
        'dynamic-api-module:derived-field',
        { computeFn: doubleFn, on: 'save' },
        DerivedUpdateEntity.prototype,
        'double',
      );
    });

    const setupDerivedModel = () => {
      const findOneExec = vi.fn().mockResolvedValue({ _id: fakeId });
      const findByIdExec = vi.fn().mockResolvedValue({ _id: fakeId, val: 5 });
      const updateOneExec = vi.fn().mockResolvedValue(fakeUpdateResult);
      const derivedModel = {
        findOne: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findOneExec })) })),
        findById: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findByIdExec })) })),
        updateOne: vi.fn(() => ({ exec: updateOneExec })),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(derivedModel as unknown as Model<unknown>);

      return derivedModel;
    };

    it('updateOneDocument should resolve the target id and recompute derived fields after the write', async () => {
      const derivedModel = setupDerivedModel();
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await svc['callbackMethods'].updateOneDocument(DerivedUpdateEntity, fakeQuery, { val: 5 });

      expect(result).toEqual(fakeUpdateResult);
      expect(derivedModel.findOne).toHaveBeenCalledWith(fakeQuery, { _id: 1 });
      expect(derivedModel.updateOne).toHaveBeenNthCalledWith(1, fakeQuery, { val: 5 });
      expect(derivedModel.findById).toHaveBeenCalledWith(fakeId);
      expect(derivedModel.updateOne).toHaveBeenNthCalledWith(2, { _id: fakeId }, { $set: { double: 10 } });
    });

    it('rawUpdateOneDocument should resolve the target id and recompute derived fields after the write', async () => {
      const derivedModel = setupDerivedModel();
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await svc['callbackMethods'].rawUpdateOneDocument(DerivedUpdateEntity, fakeQuery, { $set: { val: 5 } });

      expect(result).toEqual(fakeUpdateResult);
      expect(derivedModel.findOne).toHaveBeenCalledWith(fakeQuery, { _id: 1 });
      expect(derivedModel.updateOne).toHaveBeenNthCalledWith(1, fakeQuery, { $set: { val: 5 } });
      expect(derivedModel.findById).toHaveBeenCalledWith(fakeId);
      expect(derivedModel.updateOne).toHaveBeenNthCalledWith(2, { _id: fakeId }, { $set: { double: 10 } });
    });

    it('updateOneDocument should not resolve a target id or recompute anything when no document matches the query', async () => {
      const findOneExec = vi.fn().mockResolvedValue(null);
      const updateOneExec = vi.fn().mockResolvedValue(fakeUpdateResult);
      const derivedModel = {
        findOne: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findOneExec })) })),
        findById: vi.fn(),
        updateOne: vi.fn(() => ({ exec: updateOneExec })),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(derivedModel as unknown as Model<unknown>);
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].updateOneDocument(DerivedUpdateEntity, fakeQuery, { val: 5 });

      expect(derivedModel.findById).not.toHaveBeenCalled();
      expect(derivedModel.updateOne).toHaveBeenCalledTimes(1); // the write itself only, no recompute
    });

    it('updateOneDocument should not call findOne at all when the entity has no derived fields declared', async () => {
      exec.mockResolvedValue(fakeUpdateResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].updateOneDocument(TestEntity, fakeQuery, { name: 'unit' });

      expect(fakeModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('deleteManyDocuments', () => {
    it('should call the model deleteMany method with the query and return the delete result', async () => {
      exec.mockResolvedValue(fakeDeleteResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].deleteManyDocuments(TestEntity, [fakeId]);

      expect(result).toEqual(fakeDeleteResult);
      expect(fakeModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: [fakeId] } });
    });

    it('should call the model updateMany method with the query and data and return the delete result', async () => {
      exec.mockResolvedValue(fakeUpdateResult);
      fakeModel.schema.paths = {
        deletedAt: {},
        isDeleted: {},
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestSoftService(fakeModel as unknown as Model<TestSoftEntity>);

      const result = await service['callbackMethods'].deleteManyDocuments(TestSoftEntity, [fakeId]);

      expect(result).toEqual({ deletedCount: fakeUpdateResult.modifiedCount });
      expect(fakeModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [fakeId] } },
        { isDeleted: true, deletedAt: expect.any(Date) },
      );
    });
  });

  describe('deleteOneDocument', () => {
    it('should call the model deleteOne method with the query and return the document', async () => {
      exec.mockResolvedValue(fakeDeleteResult);
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestService(fakeModel as unknown as Model<TestEntity>);

      const result = await service['callbackMethods'].deleteOneDocument(TestEntity, fakeId);

      expect(result).toEqual(fakeDeleteResult);
      expect(fakeModel.deleteOne).toHaveBeenCalledWith(fakeQuery);
    });

    it('should call the model updateOne method with the query and data and return the document', async () => {
      exec.mockResolvedValue(fakeUpdateResult);
      fakeModel.schema.paths = {
        deletedAt: {},
        isDeleted: {},
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel as unknown as Model<unknown>);
      const service = new TestSoftService(fakeModel as unknown as Model<TestSoftEntity>);

      const result = await service['callbackMethods'].deleteOneDocument(TestSoftEntity, fakeId);

      expect(result).toEqual({ deletedCount: fakeUpdateResult.modifiedCount });
      expect(fakeModel.updateOne).toHaveBeenCalledWith(
        { _id: fakeId },
        { isDeleted: true, deletedAt: expect.any(Date) },
      );
    });
  });

  describe('buildInstance', () => {
    it('should build an instance of the entity with id defined and remove _id and __v properties', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const document = {
        _id: 'id',
        __v: 1,
        name: 'toto',
      } as unknown as TestEntity;

      const instance = service['buildInstance'](document);

      expect(instance).toEqual({
        id: 'id',
        name: 'toto',
      });
    });

    it('should build an instance of the entity with deletedAt if isDeleted is true', () => {
      const service = new TestSoftService({} as unknown as Model<TestSoftEntity>);
      const deletedAt = new Date();
      const document = {
        _id: 'id',
        __v: 1,
        name: 'toto',
        isDeleted: true,
        deletedAt,
      } as unknown as TestSoftEntity;

      const instance = service['buildInstance'](document);

      expect(instance).toEqual({
        id: 'id',
        name: 'toto',
        deletedAt,
      });
    });
  });

  describe('handleDuplicateKeyError', () => {
    it('should throw a ConflictException with the property that caused the error if error code is mongo duplicated error code', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        code: 11000,
        keyValue: { name: 'toto' },
      };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new ConflictException(`name 'toto' is already used`),
      );
    });

    it('should throw a ConflictException with no property details when keyValue is undefined', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = { code: 11000 };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(ConflictException);
    });

    it(
      'should throw a ConflictException with the combination that caused the error if error code is mongo duplicated error code',
      () => {
        const service = new TestService({} as unknown as Model<TestEntity>);
        const error = {
          code: 11000,
          keyValue: {
            name: 'toto',
            test: 'unit',
          },
        };

        expect(() => service['handleDuplicateKeyError'](error)).toThrow(
          new ConflictException(
            `The combination of name 'toto', test 'unit' already exists`,
          ),
        );
      },
    );

    it('should throw a ServiceUnavailableException if the error code is not mongo duplicated error code', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        code: 1,
        message: 'error',
      };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new ServiceUnavailableException('error'),
      );
    });

    it('should wrap error without string message using JSON.stringify', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = { code: 999 };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new ServiceUnavailableException(JSON.stringify(error)),
      );
    });

    it('should not throw an error if reThrow is false', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        code: 1,
        message: 'error',
      };

      expect(() => service['handleDuplicateKeyError'](error, false)).not.toThrow();
    });

    it('should throw original error if is instance of HttpException', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = new NotFoundException('Original not found error');

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(error);
    });

    it('should wrap a native Error in ServiceUnavailableException using error.message', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = new Error('native error message');

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new ServiceUnavailableException('native error message'),
      );
    });
  });

  describe('handleMongoErrors', () => {
    it(
      'should throw a NotFoundException with the message "Document not found" if the error name is "CastError"',
      () => {
        const service = new TestService({} as unknown as Model<TestEntity>);
        const error = {
          name: 'CastError',
        };

        expect(() => service['handleMongoErrors'](error)).toThrow(
          new NotFoundException('Document not found'),
        );
      },
    );

    it('should throw a BadRequestException with the error message if the error name is "ValidationError"', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        name: 'ValidationError',
        errors: {
          test: {
            properties: {
              message: 'validation error',
            },
          },
        },
      };

      expect(() => service['handleMongoErrors'](error)).toThrow(
        new BadRequestException(['validation error']),
      );
    });

    it(
      'should throw a BadRequestException with the message "Invalid payload" if the error name is "ValidationError" and there is no error message',
      () => {
        const service = new TestService({} as unknown as Model<TestEntity>);
        const error = {
          name: 'ValidationError',
          errors: {},
        };

        expect(() => service['handleMongoErrors'](error)).toThrow(
          new BadRequestException(['Invalid payload']),
        );
      },
    );

    it('should throw BadRequestException with "Invalid payload" when errors property is undefined', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = { name: 'ValidationError' };

      expect(() => service['handleMongoErrors'](error)).toThrow(
        new BadRequestException(['Invalid payload']),
      );
    });

    it('should throw a ServiceUnavailableException if the error name is not "CastError" or "ValidationError"', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        name: 'Error',
        message: 'error',
      };

      expect(() => service['handleMongoErrors'](error)).toThrow(
        new ServiceUnavailableException('error'),
      );
    });

    it('should not throw an error if reThrow is false', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = {
        name: 'Error',
        message: 'error',
      };

      expect(() => service['handleMongoErrors'](error, false)).not.toThrow();
    });

    it('should throw original error if is instance of HttpException', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = new NotFoundException('Original not found error');

      expect(() => service['handleMongoErrors'](error)).toThrow(error);
    });

    it('should wrap a native Error in ServiceUnavailableException using error.message', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const error = new Error('native mongo error');

      expect(() => service['handleMongoErrors'](error)).toThrow(
        new ServiceUnavailableException('native mongo error'),
      );
    });
  });

  describe('handleDocumentNotFound', () => {
    it('should throw a NotFoundException with the message "Document not found"', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);

      expect(() => service['handleDocumentNotFound']()).toThrow(
        new NotFoundException('Document not found'),
      );
    });
  });

  describe('verifyArguments', () => {
    it('should throw a BadRequestException if one argument is not defined', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);

      expect(() => service['verifyArguments']({}, 12, undefined, 'test')).toThrow(
        new BadRequestException('Invalid or missing argument'),
      );
    });
  });

  describe('addDocumentId', () => {
    it('should add the document id to the data and return the data', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      const data = { _id: fakeId, name: 'toto' } as unknown as TestEntity;

      const result = service['addDocumentId'](data);

      expect(result).toEqual({ id: fakeId, ...data });
    });
  });

  describe('applyDerivedFields', () => {
    class DerivedEntity extends BaseEntity {
      firstName: string;
      lastName: string;
      fullName: string;
      score: number;
      displayScore: string;
    }

    // Register derived field metadata manually (simulating @DerivedField decorator)
    const fullNameFn = (e: Partial<DerivedEntity>) => `${e.firstName} ${e.lastName}`;
    const scoreFn = (e: Partial<DerivedEntity>) => `Score: ${e.score}`;
    const readOnlyFn = (e: Partial<DerivedEntity>) => `readonly:${e.firstName}`;

    beforeEach(() => {
      // Reset metadata for a fresh state per test
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', [], DerivedEntity.prototype);
    });

    it('should return partial unchanged when no derived keys registered', () => {
      const service = new TestService({} as unknown as Model<TestEntity>);
      (service as unknown as { entity: typeof TestEntity }).entity = TestEntity;
      const partial = { name: 'test' };
      expect(service['applyDerivedFields'](partial, 'save')).toEqual(partial);
    });

    it('should apply save-triggered derived field', () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['fullName'], DerivedEntity.prototype);
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: fullNameFn, on: 'save' }, DerivedEntity.prototype, 'fullName');

      class DerivedService extends BaseService<DerivedEntity> {
        protected entity = DerivedEntity;
        constructor() { super({} as unknown as Model<DerivedEntity>); }
      }
      const svc = new DerivedService();
      const result = svc['applyDerivedFields']({ firstName: 'John', lastName: 'Doe' }, 'save');
      expect(result.fullName).toBe('John Doe');
    });

    it('should merge existingDoc with partial before deriving fields when existingDoc is provided', () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['fullName'], DerivedEntity.prototype);
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: fullNameFn, on: 'save' }, DerivedEntity.prototype, 'fullName');

      class DerivedServiceExisting extends BaseService<DerivedEntity> {
        protected entity = DerivedEntity;
        constructor() { super({} as unknown as Model<DerivedEntity>); }
      }
      const svc = new DerivedServiceExisting();
      // partial only has lastName — firstName comes from existingDoc
      const result = svc['applyDerivedFields'](
        { lastName: 'Doe' },
        'save',
        { firstName: 'Jane', lastName: 'Old' },
      );
      // snapshot = { firstName: 'Jane', lastName: 'Doe' } → fullName = 'Jane Doe'
      expect(result.fullName).toBe('Jane Doe');
    });

    it('should NOT apply save field when trigger is read', () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['fullName'], DerivedEntity.prototype);
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: fullNameFn, on: 'save' }, DerivedEntity.prototype, 'fullName');

      class DerivedService2 extends BaseService<DerivedEntity> {
        protected entity = DerivedEntity;
        constructor() { super({} as unknown as Model<DerivedEntity>); }
      }
      const svc = new DerivedService2();
      const result = svc['applyDerivedFields']({ firstName: 'John', lastName: 'Doe' }, 'read');
      expect(result.fullName).toBeUndefined();
    });

    it('should apply both-triggered field on save and read', () => {
      class BothEntity extends BaseEntity {
        val: number;
        double: number;
      }
      const doubleFn = (e: Partial<BothEntity>) => (e.val ?? 0) * 2;
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], BothEntity.prototype);
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: doubleFn, on: 'both' }, BothEntity.prototype, 'double');

      class BothService extends BaseService<BothEntity> {
        protected entity = BothEntity;
        constructor() { super({} as unknown as Model<BothEntity>); }
      }
      const svc = new BothService();

      expect(svc['applyDerivedFields']({ val: 5 }, 'save').double).toBe(10);
      expect(svc['applyDerivedFields']({ val: 3 }, 'read').double).toBe(6);
    });

    it('should use snapshot (not mutated result) for all computeFns', () => {
      class SnapshotEntity extends BaseEntity {
        x: number;
        y: number;
        sumXY: number;
        diff: number;
      }
      const sumFn = (e: Partial<SnapshotEntity>) => (e.x ?? 0) + (e.y ?? 0);
      const diffFn = (e: Partial<SnapshotEntity>) => (e.x ?? 0) - (e.y ?? 0);
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['sumXY', 'diff'], SnapshotEntity.prototype);
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: sumFn, on: 'save' }, SnapshotEntity.prototype, 'sumXY');
      Reflect.defineMetadata('dynamic-api-module:derived-field', { computeFn: diffFn, on: 'save' }, SnapshotEntity.prototype, 'diff');

      class SnapshotService extends BaseService<SnapshotEntity> {
        protected entity = SnapshotEntity;
        constructor() { super({} as unknown as Model<SnapshotEntity>); }
      }
      const svc = new SnapshotService();
      const result = svc['applyDerivedFields']({ x: 10, y: 3 }, 'save');
      expect(result.sumXY).toBe(13);
      expect(result.diff).toBe(7);
    });
  });

  describe('recomputeDerivedFields', () => {
    class RecomputeEntity extends BaseEntity {
      val: number;
      double: number;
    }
    const doubleFn = (e: Partial<RecomputeEntity>) => (e.val ?? 0) * 2;

    beforeEach(() => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', [], RecomputeEntity.prototype);
    });

    it('should be a no-op and never resolve a model when the entity has no derived fields declared', async () => {
      const getEntityModelSpy = vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel');
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].recomputeDerivedFields(TestEntity, fakeId);

      expect(getEntityModelSpy).not.toHaveBeenCalled();
    });

    it('should recompute and persist derived fields from the document\'s current, full state', async () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], RecomputeEntity.prototype);
      Reflect.defineMetadata(
        'dynamic-api-module:derived-field',
        { computeFn: doubleFn, on: 'save' },
        RecomputeEntity.prototype,
        'double',
      );
      const findByIdExec = vi.fn().mockResolvedValue({ _id: fakeId, val: 5 });
      const updateOneExec = vi.fn().mockResolvedValue(fakeUpdateResult);
      const recomputeModel = {
        findById: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findByIdExec })) })),
        updateOne: vi.fn(() => ({ exec: updateOneExec })),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(recomputeModel as unknown as Model<unknown>);
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].recomputeDerivedFields(RecomputeEntity, fakeId);

      expect(recomputeModel.findById).toHaveBeenCalledWith(fakeId);
      expect(recomputeModel.updateOne).toHaveBeenCalledWith({ _id: fakeId }, { $set: { double: 10 } });
    });

    it('should be a no-op when the document does not exist', async () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], RecomputeEntity.prototype);
      Reflect.defineMetadata(
        'dynamic-api-module:derived-field',
        { computeFn: doubleFn, on: 'save' },
        RecomputeEntity.prototype,
        'double',
      );
      const findByIdExec = vi.fn().mockResolvedValue(null);
      const recomputeModel = {
        findById: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findByIdExec })) })),
        updateOne: vi.fn(),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(recomputeModel as unknown as Model<unknown>);
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].recomputeDerivedFields(RecomputeEntity, fakeId);

      expect(recomputeModel.updateOne).not.toHaveBeenCalled();
    });

    it('should be a no-op when every declared derived field is read-only (none apply on save)', async () => {
      const readOnlyFn = (e: Partial<RecomputeEntity>) => `readonly:${e.val}`;
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], RecomputeEntity.prototype);
      Reflect.defineMetadata(
        'dynamic-api-module:derived-field',
        { computeFn: readOnlyFn, on: 'read' },
        RecomputeEntity.prototype,
        'double',
      );
      const findByIdExec = vi.fn().mockResolvedValue({ _id: fakeId, val: 5 });
      const recomputeModel = {
        findById: vi.fn(() => ({ lean: vi.fn(() => ({ exec: findByIdExec })) })),
        updateOne: vi.fn(),
      };
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(recomputeModel as unknown as Model<unknown>);
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);

      await svc['callbackMethods'].recomputeDerivedFields(RecomputeEntity, fakeId);

      expect(recomputeModel.updateOne).not.toHaveBeenCalled();
    });

    it('should catch a failure and log a warning instead of throwing — this always runs after a write already succeeded', async () => {
      Reflect.defineMetadata('dynamic-api-module:derived-field-keys', ['double'], RecomputeEntity.prototype);
      Reflect.defineMetadata(
        'dynamic-api-module:derived-field',
        { computeFn: doubleFn, on: 'save' },
        RecomputeEntity.prototype,
        'double',
      );
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockRejectedValue(new Error('boom'));
      const svc = new TestService(fakeModel as unknown as Model<TestEntity>);
      const warnSpy = vi.spyOn(svc['baseServiceLogger'], 'warn').mockImplementation();

      await expect(
        svc['callbackMethods'].recomputeDerivedFields(RecomputeEntity, fakeId),
      ).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to recompute derived fields'));
    });
  });

  describe('invokeAfterSaveCallback', () => {
    let errorSpy: Mock;

    beforeEach(() => {
      (service as unknown as { entity: typeof TestEntity }).entity = TestEntity;
      errorSpy = vi.spyOn(service['baseServiceLogger'], 'error').mockImplementation();
      (DynamicApiModule.state.get as Mock).mockReset();
    });

    it('should do nothing when callback is undefined', async () => {
      await service['invokeAfterSaveCallback'](undefined, expectedEntity, undefined);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(getValueSpy).not.toHaveBeenCalled();
    });

    it('should call the callback once and not log on success', async () => {
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockResolvedValue(undefined);

      await service['invokeAfterSaveCallback'](callback, expectedEntity, 'user-1');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedEntity, service['callbackMethods'], 'user-1');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log and call the global onAfterSaveError hook when callback rejects without retry', async () => {
      const error = new Error('boom');
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockRejectedValue(error);
      const onAfterSaveError = vi.fn();
      (DynamicApiModule.state.get as Mock).mockReturnValue(onAfterSaveError);

      await expect(
        service['invokeAfterSaveCallback'](callback, expectedEntity, 'user-1'),
      ).resolves.toBeUndefined();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'), error.stack);
      expect(getValueSpy).toHaveBeenCalledWith('onAfterSaveError');
      expect(onAfterSaveError).toHaveBeenCalledWith(error, {
        entityName: 'TestEntity',
        entity: expectedEntity,
        user: 'user-1',
      });
    });

    it('should not log or call the hook when a failing attempt is followed by a successful retry', async () => {
      const callback: AfterSaveCallback<TestEntity> = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);

      await service['invokeAfterSaveCallback'](callback, expectedEntity, undefined, { attempts: 2 });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(getValueSpy).not.toHaveBeenCalled();
    });

    it('should log once after exhausting all retry attempts', async () => {
      const error = new Error('always fails');
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockRejectedValue(error);
      (DynamicApiModule.state.get as Mock).mockReturnValue(undefined);

      await service['invokeAfterSaveCallback'](callback, expectedEntity, undefined, { attempts: 3 });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('3 attempt(s)'), error.stack);
    });

    it('should wait delayMs between attempts', async () => {
      const callback: AfterSaveCallback<TestEntity> = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);
      const start = Date.now();

      await service['invokeAfterSaveCallback'](callback, expectedEntity, undefined, { attempts: 2, delayMs: 30 });

      expect(Date.now() - start).toBeGreaterThanOrEqual(25);
    });

    it('should not delay after the last attempt', async () => {
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockRejectedValue(new Error('boom'));
      (DynamicApiModule.state.get as Mock).mockReturnValue(undefined);
      const start = Date.now();

      await service['invokeAfterSaveCallback'](callback, expectedEntity, undefined, { attempts: 1, delayMs: 1000 });

      expect(Date.now() - start).toBeLessThan(100);
    });

    it('should catch and log when the global onAfterSaveError hook itself throws', async () => {
      const error = new Error('boom');
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockRejectedValue(error);
      const hookError = new Error('hook failed');
      (DynamicApiModule.state.get as Mock).mockReturnValue(vi.fn().mockRejectedValue(hookError));

      await expect(
        service['invokeAfterSaveCallback'](callback, expectedEntity, undefined),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'), error.stack);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('hook failed'), hookError.stack);
    });

    it('should treat a missing onAfterSaveError hook as a no-op', async () => {
      const error = new Error('boom');
      const callback: AfterSaveCallback<TestEntity> = vi.fn().mockRejectedValue(error);
      (DynamicApiModule.state.get as Mock).mockReturnValue(undefined);

      await expect(
        service['invokeAfterSaveCallback'](callback, expectedEntity, undefined),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteWithCascade', () => {
    it('skips the transaction entirely and just runs deleteParent when cascade is empty', async () => {
      const model = { db: { startSession: vi.fn() } } as unknown as Model<TestEntity>;
      const testService = new TestService(model);
      const deleteParent = vi.fn().mockResolvedValue(3);

      const result = await testService['deleteWithCascade'](deleteParent, ['id'], false, []);

      expect(result).toStrictEqual({ deletedCount: 3, cascadeCompleted: true });
      expect(deleteParent).toHaveBeenCalledWith();
      expect(model.db.startSession).not.toHaveBeenCalled();
    });
  });

  describe('writeAuditLog', () => {
    it('writes an entry to <collection>_audit_log via the native driver', async () => {
      const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
      const testModel = {
        collection: { collectionName: 'widgets' },
        db: { collection: vi.fn().mockReturnValue({ insertOne }) },
      } as unknown as Model<TestEntity>;
      const testService = new TestService(testModel);
      const before = { name: 'old' };
      const after = { name: 'new' };

      await testService['writeAuditLog']('update', 'entity-id', before, after, { id: 'user-1' });

      expect(testModel.db.collection).toHaveBeenCalledWith('widgets_audit_log');
      expect(insertOne).toHaveBeenCalledWith({
        action: 'update',
        entityId: 'entity-id',
        before,
        after,
        user: { id: 'user-1' },
        timestamp: expect.any(Date),
      });
    });

    it('logs and swallows the error instead of throwing when the write fails', async () => {
      const testModel = {
        collection: { collectionName: 'widgets' },
        db: { collection: vi.fn().mockReturnValue({ insertOne: vi.fn().mockRejectedValue(new Error('boom')) }) },
      } as unknown as Model<TestEntity>;
      const testService = new TestService(testModel);
      const warnSpy = vi.spyOn(testService['baseServiceLogger'], 'warn').mockImplementation();

      await expect(
        testService['writeAuditLog']('delete', 'entity-id', { name: 'old' }, null, undefined),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[AuditLog] Failed to write audit entry (delete)'));
    });

    it('stringifies a non-Error rejection instead of throwing', async () => {
      const testModel = {
        collection: { collectionName: 'widgets' },
        db: { collection: vi.fn().mockReturnValue({ insertOne: vi.fn().mockRejectedValue('boom') }) },
      } as unknown as Model<TestEntity>;
      const testService = new TestService(testModel);
      const warnSpy = vi.spyOn(testService['baseServiceLogger'], 'warn').mockImplementation();

      await expect(
        testService['writeAuditLog']('delete', 'entity-id', { name: 'old' }, null, undefined),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('entity-id: boom'));
    });
  });
});
