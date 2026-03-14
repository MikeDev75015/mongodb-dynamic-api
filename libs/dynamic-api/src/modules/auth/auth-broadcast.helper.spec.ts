import { BaseEntity } from '../../models';
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
});

