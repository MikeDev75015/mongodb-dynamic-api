import { BadRequestException } from '@nestjs/common';
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
});
