import { describe, expect, it } from 'vitest';
import { BaseEntity } from '../models';
import { applyFromUser } from './from-user.helper';

class TestEntity extends BaseEntity {
  name: string;
  createdBy: string;
  tenantId: string;
}

describe('applyFromUser', () => {
  const partial: Partial<TestEntity> = { name: 'foo' };
  const user = { email: 'alice@example.com', tid: 'tenant-42' };

  it('should return partial unchanged when fromUser is undefined', () => {
    expect(applyFromUser(partial, undefined, user)).toEqual(partial);
  });

  it('should return partial unchanged when user is nullish', () => {
    expect(applyFromUser(partial, { createdBy: 'email' }, undefined)).toEqual(partial);
    expect(applyFromUser(partial, { createdBy: 'email' }, null)).toEqual(partial);
  });

  it('should inject a string claim from user', () => {
    const result = applyFromUser(partial, { createdBy: 'email' }, user);
    expect(result.createdBy).toBe('alice@example.com');
    expect(result.name).toBe('foo');
  });

  it('should inject value from extractor function', () => {
    const result = applyFromUser(
      partial,
      { tenantId: (u: unknown) => (u as typeof user).tid },
      user,
    );
    expect(result.tenantId).toBe('tenant-42');
  });

  it('should inject multiple fields', () => {
    const result = applyFromUser(
      partial,
      {
        createdBy: 'email',
        tenantId: (u: unknown) => (u as typeof user).tid,
      },
      user,
    );
    expect(result.createdBy).toBe('alice@example.com');
    expect(result.tenantId).toBe('tenant-42');
  });

  it('should not mutate the original partial', () => {
    const original: Partial<TestEntity> = { name: 'bar' };
    applyFromUser(original, { createdBy: 'email' }, user);
    expect(original).not.toHaveProperty('createdBy');
  });

  it('should skip field if claim key does not exist on user', () => {
    const result = applyFromUser(partial, { createdBy: 'nonExistentClaim' }, user);
    expect(result.createdBy).toBeUndefined();
  });
});


