import { afterEach, describe, expect, it, test, vi } from 'vitest';
import { BaseEntity } from '../../models';
import { DynamicApiGlobalStateService } from '../../services/dynamic-api-global-state/dynamic-api-global-state.service';
import { buildAuthBroadcastData } from './auth-broadcast.helper';

describe('buildAuthBroadcastData', () => {
  class TestEntity extends BaseEntity {
    name: string;
    email: string;
    role: string;
  }

  const user: Partial<TestEntity> = {
    id: 'user-id',
    name: 'John',
    email: 'john@test.com',
    role: 'admin',
  };

  describe('sensitive fields', () => {
    const userWithSecrets = { ...user, password: 'hash', refreshToken: 'stored-jti-hash' } as Partial<TestEntity>;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const mockState = (credentials: { passwordField: string } | null, refreshTokenField?: string) => {
      vi.spyOn(DynamicApiGlobalStateService, 'getValue').mockImplementation(((key: string) => (
        key === 'credentials' ? credentials : refreshTokenField
      )) as typeof DynamicApiGlobalStateService.getValue);
    };

    it.each([
      ['no fields are given', undefined],
      ['the fields list them explicitly', ['id', 'password', 'refreshToken'] as (keyof TestEntity)[]],
    ])('should always remove the password and refresh token fields when %s', (_, fields) => {
      mockState({ passwordField: 'password' }, 'refreshToken');

      const result = buildAuthBroadcastData(userWithSecrets, fields);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id', 'user-id');
    });

    it('should keep every field when auth is not configured', () => {
      mockState(null);

      expect(buildAuthBroadcastData(userWithSecrets)).toEqual(userWithSecrets);
    });
  });

  it('should return a full copy of the user when fields is undefined', () => {
    const result = buildAuthBroadcastData(user);

    expect(result).toEqual(user);
    expect(result).not.toBe(user);
  });

  it('should return a full copy of the user when fields is an empty array', () => {
    const result = buildAuthBroadcastData(user, []);

    expect(result).toEqual(user);
    expect(result).not.toBe(user);
  });

  it('should return only the specified fields when fields are provided', () => {
    const result = buildAuthBroadcastData(user, ['id', 'name']);

    expect(result).toEqual({ id: 'user-id', name: 'John' });
  });

  it('should return a single field when only one field is specified', () => {
    const result = buildAuthBroadcastData(user, ['email']);

    expect(result).toEqual({ email: 'john@test.com' });
  });

  it('should ignore fields that do not exist on the user', () => {
    const result = buildAuthBroadcastData(user, ['id', 'nonExistent' as keyof TestEntity]);

    expect(result).toEqual({ id: 'user-id' });
  });

  it.each([
    ['no fields are given', undefined],
    ['sid is explicitly listed', ['id', 'sid'] as (keyof TestEntity)[]],
  ])('should always strip the sid session claim when %s', (_, fields) => {
    const result = buildAuthBroadcastData({ ...user, sid: 'session-id' } as TestEntity, fields);

    expect(result).not.toHaveProperty('sid');
    expect(result).toHaveProperty('id', 'user-id');
  });
});
