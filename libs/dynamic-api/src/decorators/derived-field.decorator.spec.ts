import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DERIVED_FIELD_KEYS_METADATA, DERIVED_FIELD_METADATA, DerivedField, DerivedFieldMeta } from './derived-field.decorator';

class TestEntity {
  name: string;
  slug: string;
  score: number;
}

describe('DerivedField', () => {
  describe('metadata storage', () => {
    it('should store computeFn and default on:"save" on the property', () => {
      const computeFn = (e: Partial<TestEntity>) => e.name?.toLowerCase();

      DerivedField(computeFn)(TestEntity.prototype, 'slug');

      const meta: DerivedFieldMeta<TestEntity> = Reflect.getMetadata(
        DERIVED_FIELD_METADATA,
        TestEntity.prototype,
        'slug',
      );

      expect(meta).toBeDefined();
      expect(meta.computeFn).toBe(computeFn);
      expect(meta.on).toBe('save');
    });

    it('should respect custom on option', () => {
      const computeFn = (e: Partial<TestEntity>) => e.name?.length ?? 0;

      DerivedField(computeFn, { on: 'read' })(TestEntity.prototype, 'score');

      const meta: DerivedFieldMeta<TestEntity> = Reflect.getMetadata(
        DERIVED_FIELD_METADATA,
        TestEntity.prototype,
        'score',
      );

      expect(meta.on).toBe('read');
    });

    it('should append the property key to the DERIVED_FIELD_KEYS_METADATA list', () => {
      class FreshEntity {
        a: string;
        b: string;
      }

      const fn = () => 'x';
      DerivedField(fn)(FreshEntity.prototype, 'a');
      DerivedField(fn)(FreshEntity.prototype, 'b');

      const keys: string[] = Reflect.getMetadata(DERIVED_FIELD_KEYS_METADATA, FreshEntity.prototype);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });
  });

  describe('computeFn behaviour', () => {
    it('computeFn receives entity snapshot and returns derived value', () => {
      class Post {
        firstName: string;
        lastName: string;
        fullName: string;
      }

      const fullNameFn = (e: Partial<Post>) => `${e.firstName} ${e.lastName}`;
      DerivedField(fullNameFn)(Post.prototype, 'fullName');

      const meta: DerivedFieldMeta<Post> = Reflect.getMetadata(
        DERIVED_FIELD_METADATA,
        Post.prototype,
        'fullName',
      );

      expect(meta.computeFn({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe');
    });
  });
});


