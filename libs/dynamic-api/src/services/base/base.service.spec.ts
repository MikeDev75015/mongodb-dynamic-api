import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Model, Schema } from 'mongoose';
import { AbilityPredicate, DeleteResult, UpdateResult } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';
import { BaseService } from './base.service';

class TestEntity extends BaseEntity {
  name: string;
  password?: string;
}

class TestService extends BaseService<TestEntity> {
  protected abilityPredicate: AbilityPredicate<TestEntity> | undefined;
  constructor(protected readonly model: any) {
    super(model);
  }
}

class TestWithPasswordFieldService extends BaseService<TestEntity> {
  passwordField = 'password' as keyof TestEntity;
  constructor(protected readonly model: any) {
    super(model);
  }
}

describe('BaseService', () => {
  let service: TestService;
  let fakeModel: any;

  const fakeId = 'fake-id';
  const fakeEntity = { id: fakeId, name: 'toto' } as TestEntity;
  const fakeQuery = { _id: 'fake-id' };
  const fakeUpdateResult = { modifiedCount: 1 } as UpdateResult;
  const fakeDeleteResult = { deletedCount: 1 } as DeleteResult;
  const exec = jest.fn();

  beforeEach(() => {
    const lean = jest.fn(() => ({ exec }));
    fakeModel = {
      find: jest.fn(() => ({ lean })),
      findOne: jest.fn(() => ({ lean })),
      create: jest.fn(),
      updateOne: jest.fn(() => ({ exec })),
      updateMany: jest.fn(() => ({ exec })),
      deleteOne: jest.fn(() => ({ exec })),
      deleteMany: jest.fn(() => ({ exec })),
      schema: {
        paths: {},
      } as Schema<any>
    };

    service = new TestService(fakeModel);
  });

  describe('callbackMethods', () => {
    it('should have methods', () => {

      expect(service['callbackMethods']).toEqual({
        findManyDocuments: expect.any(Function),
        findOneDocument: expect.any(Function),
        createManyDocuments: expect.any(Function),
        createOneDocument: expect.any(Function),
        updateManyDocuments: expect.any(Function),
        updateOneDocument: expect.any(Function),
        deleteManyDocuments: expect.any(Function),
        deleteOneDocument: expect.any(Function),
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
      } as any;
      const service = new TestService(model);

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
      } as any;
      const service = new TestService(model);

      expect(service.isSoftDeletable).toBe(false);
    });
  });

  describe('findManyDocumentsWithAbilityPredicate', () => {
    it('should not call handleAbilityPredicate return an array of documents', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);

      const result = await service['findManyDocumentsWithAbilityPredicate']();

      expect(result).toEqual(documents);
    });

    it('should call handleAbilityPredicate for each document and return an array of documents', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);

      const service = new TestService(model);
      service['abilityPredicate'] = jest.fn().mockReturnValue(true);

      const result = await service['findManyDocumentsWithAbilityPredicate']();

      expect(result).toEqual(documents);
      expect(service['abilityPredicate']).toHaveBeenCalledTimes(documents.length);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);
      service['abilityPredicate'] = jest.fn().mockReturnValue(false);

      await expect(service['findManyDocumentsWithAbilityPredicate']()).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });
  });

  describe('findOneDocumentWithAbilityPredicate', () => {
    it('should not call handleAbilityPredicate return the document', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);

      const result = await service['findOneDocumentWithAbilityPredicate']('id', { test: 'unit' });

      expect(result).toEqual(document);
    });

    it('should call handleAbilityPredicate for the document and return the document', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);
      service['abilityPredicate'] = jest.fn().mockReturnValue(true);

      const result = await service['findOneDocumentWithAbilityPredicate']('id');

      expect(result).toEqual(document);
      expect(service['abilityPredicate']).toHaveBeenCalledTimes(1);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);
      service['abilityPredicate'] = jest.fn().mockReturnValue(false);

      await expect(service['findOneDocumentWithAbilityPredicate']('id')).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });

    it('should throw a NotFoundException if the document is not found', async () => {
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as unknown as Model<any>;
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
      const service = new TestService(model);

      await expect(service['findOneDocumentWithAbilityPredicate']('id')).rejects.toThrow(
        new NotFoundException('Document not found'),
      );
    });
  });

  describe('findManyDocuments', () => {
    it('should call the model find method with the query and return the documents', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      exec.mockResolvedValue(documents);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].findManyDocuments(TestEntity, fakeQuery);

      expect(result).toEqual(documents);
      expect(fakeModel.find).toHaveBeenCalledWith(fakeQuery);
    });
  });

  describe('findOneDocument', () => {
    it('should call the model findOne method with the query and return the document', async () => {
      exec.mockResolvedValue(fakeEntity);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].findOneDocument(TestEntity, fakeQuery);

      expect(result).toEqual(fakeEntity);
      expect(fakeModel.findOne).toHaveBeenCalledWith(fakeQuery);
    });
  });

  describe('createManyDocuments', () => {
    it('should call the model create method with the data and return the documents', async () => {
      const data = [{ name: 'toto' }, { name: 'unit' }];
      fakeModel.create.mockResolvedValue(data);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].createManyDocuments(TestEntity, data);

      expect(result).toEqual(data);
      expect(fakeModel.create).toHaveBeenCalledWith(data);
    });
  });

  describe('createOneDocument', () => {
    it('should call the model create method with the data and return the document', async () => {
      fakeModel.create.mockResolvedValue(fakeEntity);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].createOneDocument(TestEntity, fakeEntity);

      expect(result).toEqual(fakeEntity);
      expect(fakeModel.create).toHaveBeenCalledWith(fakeEntity);
    });
  });

  describe('updateManyDocuments', () => {
    it('should call the model updateMany method with the query and data and return the documents', async () => {
      const data = { name: 'unit' };
      exec.mockResolvedValue(fakeUpdateResult);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].updateManyDocuments(TestEntity, fakeQuery, data);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateMany).toHaveBeenCalledWith(fakeQuery, data);
    });
  });

  describe('updateOneDocument', () => {
    it('should call the model updateOne method with the query and data and return the document', async () => {
      const data = { name: 'unit' };
      exec.mockResolvedValue(fakeUpdateResult);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].updateOneDocument(TestEntity, fakeQuery, data);

      expect(result).toEqual(fakeUpdateResult);
      expect(fakeModel.updateOne).toHaveBeenCalledWith(fakeQuery, data);
    });
  });

  describe('deleteManyDocuments', () => {
    it('should call the model deleteMany method with the query and return the documents', async () => {
      exec.mockResolvedValue(fakeDeleteResult);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].deleteManyDocuments(TestEntity, [fakeId]);

      expect(result).toEqual(fakeDeleteResult);
      expect(fakeModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: [fakeId] } });
    });
  });

  describe('deleteOneDocument', () => {
    it('should call the model deleteOne method with the query and return the document', async () => {
      exec.mockResolvedValue(fakeDeleteResult);
      jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(fakeModel);
      const service = new TestService(fakeModel);

      const result = await service['callbackMethods'].deleteOneDocument(TestEntity, fakeId);

      expect(result).toEqual(fakeDeleteResult);
      expect(fakeModel.deleteOne).toHaveBeenCalledWith(fakeQuery);
    });
  });

  describe('buildInstance', () => {
    it('should build an instance of the entity with id defined and remove _id and __v properties', () => {
      const service = new TestService({} as any);
      const document = {
        _id: 'id',
        __v: 1,
        name: 'toto',
      } as any;

      const instance = service['buildInstance'](document);

      expect(instance).toEqual({
        id: 'id',
        name: 'toto',
      });
    });
  });

  describe('handleDuplicateKeyError', () => {
    it('should throw a BadRequestException with the property that caused the error if error code is mongo duplicated error code', () => {
      const service = new TestService({} as any);
      const error = {
        code: 11000,
        keyValue: {
          name: 'toto',
        },
      };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new BadRequestException(`name 'toto' is already used`),
      );
    });

    it('should throw a BadRequestException with the combination that caused the error if error code is mongo duplicated error code', () => {
      const service = new TestService({} as any);
      const error = {
        code: 11000,
        keyValue: {
          name: 'toto',
          test: 'unit',
        },
      };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new BadRequestException(
          `The combination of name 'toto', test 'unit' already exists`,
        ),
      );
    });

    it('should not throw a ServiceUnavailableException if the error code is not mongo duplicated error code', () => {
      const service = new TestService({} as any);
      const error = {
        code: 1,
        message: 'error',
      };

      expect(() => service['handleDuplicateKeyError'](error)).toThrow(
        new ServiceUnavailableException('error'),
      );
    });
  });

  describe('handleDocumentNotFound', () => {
    it('should throw a BadRequestException with the message "Document not found"', () => {
      const service = new TestService({} as any);

      expect(() => service['handleDocumentNotFound']()).toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });
});
