import { describe, expect, it } from 'vitest';
import { BaseEntity } from '../models';
import { isAdmin } from './admin.predicate';

class TestEntity extends BaseEntity {}

interface User {
  isAdmin?: boolean;
  isSuperUser?: boolean;
  role?: string;
}

describe('isAdmin', () => {
  const entity = new TestEntity();

  describe('flag mode (default)', () => {
    it.each([
      ['true flag grants access', { isAdmin: true }, true],
      ['false flag denies access', { isAdmin: false }, false],
      ['missing flag denies access', {}, false],
    ])('%s', (_description, user: User, expected: boolean) => {
      expect(isAdmin<TestEntity, User>()(entity, user)).toBe(expected);
    });

    it('should use a custom flag field', () => {
      expect(isAdmin<TestEntity, User>({ field: 'isSuperUser' })(entity, { isSuperUser: true })).toBe(true);
      expect(isAdmin<TestEntity, User>({ field: 'isSuperUser' })(entity, { isSuperUser: false })).toBe(false);
    });
  });

  describe('role mode', () => {
    it('should grant access when the role matches the default "admin"', () => {
      expect(isAdmin<TestEntity, User>({ roleField: 'role' })(entity, { role: 'admin' })).toBe(true);
    });

    it('should deny access when the role does not match', () => {
      expect(isAdmin<TestEntity, User>({ roleField: 'role' })(entity, { role: 'user' })).toBe(false);
    });

    it('should accept an array of allowed roles', () => {
      const predicate = isAdmin<TestEntity, User>({ roleField: 'role', role: ['admin', 'superadmin'] });

      expect(predicate(entity, { role: 'superadmin' })).toBe(true);
      expect(predicate(entity, { role: 'moderator' })).toBe(false);
    });

    it('should take precedence over flag mode when both roleField and field are set', () => {
      const predicate = isAdmin<TestEntity, User>({ roleField: 'role', field: 'isAdmin' });

      expect(predicate(entity, { role: 'admin', isAdmin: false })).toBe(true);
    });
  });

  it('should deny access without throwing when user is undefined (anonymous request)', () => {
    expect(isAdmin<TestEntity, User>()(entity, undefined)).toBe(false);
    expect(isAdmin<TestEntity, User>({ roleField: 'role' })(entity, undefined)).toBe(false);
  });
});
