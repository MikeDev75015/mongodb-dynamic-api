import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BaseEntity } from '../../models';
import { BaseService } from './base.service';

describe('BaseService', () => {
  class TestEntity extends BaseEntity {
    name: string;
  }
  class TestService extends BaseService<TestEntity> {
    constructor(protected readonly model: any) {
      super(model);
    }
  }

  describe('isSoftDeletable', () => {
    it('should return true if the model has a deletedAt property', () => {
      const model = {
        schema: {
          paths: {
            deletedAt: {},
          },
        },
      } as any;
      const service = new TestService(model);

      expect(service.isSoftDeletable).toBe(true);
    });

    it('should return false if the model does not have a deletedAt property', () => {
      const model = {
        schema: {
          paths: {},
        },
      };
      const service = new TestService(model);

      expect(service.isSoftDeletable).toBe(false);
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
  });

  describe('handleDocumentNotFound', () => {
    it('should throw a BadRequestException with the message "Document not found"', () => {
      const service = new TestService({} as any);

      expect(() => service['handleDocumentNotFound']()).toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });

  describe('findManyDocuments', () => {
    it('should not call handleAbilityPredicate return an array of documents', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      };
      const service = new TestService(model);

      const result = await service.findManyDocuments();

      expect(result).toEqual(documents);
    });

    it('should call handleAbilityPredicate for each document and return an array of documents', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      };
      const service = new TestService(model);
      service.abilityPredicate = jest.fn().mockReturnValue(true);

      const result = await service.findManyDocuments();

      expect(result).toEqual(documents);
      expect(service.abilityPredicate).toHaveBeenCalledTimes(documents.length);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const documents = [{ name: 'toto' }, { name: 'unit' }];
      const model = {
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(documents),
      };
      const service = new TestService(model);
      service.abilityPredicate = jest.fn().mockReturnValue(false);

      await expect(service.findManyDocuments()).rejects.toThrowError(
        new ForbiddenException('Forbidden resource'),
      );
    });
  });

  describe('findOneDocument', () => {
    it('should not call handleAbilityPredicate return the document', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      };
      const service = new TestService(model);

      const result = await service.findOneDocument('id', { test: 'unit' });

      expect(result).toEqual(document);
    });

    it('should call handleAbilityPredicate for the document and return the document', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      };
      const service = new TestService(model);
      service.abilityPredicate = jest.fn().mockReturnValue(true);

      const result = await service.findOneDocument('id');

      expect(result).toEqual(document);
      expect(service.abilityPredicate).toHaveBeenCalledTimes(1);
    });

    it('should throw a ForbiddenException if the abilityPredicate returns false', async () => {
      const document = { name: 'toto' };
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(document),
      };
      const service = new TestService(model);
      service.abilityPredicate = jest.fn().mockReturnValue(false);

      await expect(service.findOneDocument('id')).rejects.toThrow(
        new ForbiddenException('Forbidden resource'),
      );
    });

    it('should throw a BadRequestException if the document is not found', async () => {
      const model = {
        findOne: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      const service = new TestService(model);

      await expect(service.findOneDocument('id')).rejects.toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });
});
