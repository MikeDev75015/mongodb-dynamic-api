import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { PROTECTED_FIELD_METADATA, ProtectedField } from './protected-field.decorator';

describe('ProtectedField', () => {
  describe('metadata storage', () => {
    it('should store the property key in the PROTECTED_FIELD_METADATA list on the prototype', () => {
      class MyEntity {
        public: string;
        secret: string;
      }

      ProtectedField()(MyEntity.prototype, 'secret');

      const keys: string[] = Reflect.getMetadata(PROTECTED_FIELD_METADATA, MyEntity.prototype);
      expect(keys).toContain('secret');
      expect(keys).not.toContain('public');
    });

    it('should accumulate multiple protected fields', () => {
      class AnotherEntity {
        visible: string;
        passwordHash: string;
        internalCode: string;
      }

      ProtectedField()(AnotherEntity.prototype, 'passwordHash');
      ProtectedField()(AnotherEntity.prototype, 'internalCode');

      const keys: string[] = Reflect.getMetadata(PROTECTED_FIELD_METADATA, AnotherEntity.prototype);
      expect(keys).toContain('passwordHash');
      expect(keys).toContain('internalCode');
      expect(keys).not.toContain('visible');
      expect(keys).toHaveLength(2);
    });

    it('should return undefined for a class with no @ProtectedField', () => {
      class CleanEntity {
        name: string;
      }

      const keys = Reflect.getMetadata(PROTECTED_FIELD_METADATA, CleanEntity.prototype);
      expect(keys).toBeUndefined();
    });
  });
});


