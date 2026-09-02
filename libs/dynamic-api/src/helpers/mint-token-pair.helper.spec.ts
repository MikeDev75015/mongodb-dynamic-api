import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createMock } from '@test-helpers';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { BaseEntity } from '../models';
import { BcryptService, DynamicApiGlobalStateService } from '../services';
import { mintTokenPair } from './mint-token-pair.helper';

const mockStateGet = vi.fn();

class TestUser extends BaseEntity {
  email: string;
  username?: string;
  role?: string;
  refreshToken?: string;
  customField?: string;
}

describe('mintTokenPair', () => {
  let model: Model<TestUser>;
  let updateOneExec: Mock;
  let getEntityModelSpy: Mock;
  let hashPasswordSpy: Mock;

  const defaultState: Record<string, unknown> = {
    jwtSecret: 'secret',
    jwtExpirationTime: '15m',
    jwtRefreshTokenExpiresIn: '7d',
    jwtRefreshSecret: undefined,
    credentials: { loginField: 'email', passwordField: 'password' },
    additionalRequestFields: [],
    refreshTokenField: undefined,
  };

  const decodePayload = (token: string): Record<string, unknown> =>
    new JwtService().decode(token) as Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(DynamicApiGlobalStateService.prototype, 'get').mockImplementation((key?: string) => mockStateGet(key));
    mockStateGet.mockImplementation((key: string) => defaultState[key]);
    hashPasswordSpy = vi.spyOn(BcryptService.prototype, 'hashPassword').mockResolvedValue('hashed-jti');
    updateOneExec = vi.fn();
    model = createMock<Model<TestUser>>();
    model.updateOne = vi.fn(() => ({ exec: updateOneExec })) as unknown as Model<TestUser>['updateOne'];
    getEntityModelSpy =
      // @ts-ignore
      vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
  });

  it('should throw when useAuth is not configured (no jwtSecret)', async () => {
    mockStateGet.mockImplementation((key: string) => (key === 'jwtSecret' ? undefined : defaultState[key]));
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    await expect(mintTokenPair(TestUser, user)).rejects.toThrow(
      '[DynamicAPI] mintTokenPair: useAuth is not configured in DynamicApiModule.forRoot(). '
      + 'mintTokenPair reuses the JWT secrets/expirations configured there.',
    );
  });

  it('should sign an access token carrying _id/id/loginField from state', async () => {
    const user = { id: '1', _id: '1', email: 'u@test.co' } as unknown as TestUser;

    const result = await mintTokenPair(TestUser, user);

    expect(decodePayload(result.accessToken)).toMatchObject({ _id: '1', id: '1', email: 'u@test.co' });
  });

  it('should sign a refresh token carrying a jti, verifiable with the default secret when refreshSecret is unset', async () => {
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    const result = await mintTokenPair(TestUser, user);

    const decoded = new JwtService({ secret: 'secret' }).verify(result.refreshToken) as Record<string, unknown>;
    expect(decoded).toMatchObject({ id: '1', email: 'u@test.co' });
    expect(decoded.jti).toEqual(expect.any(String));
  });

  it('should sign the refresh token with refreshSecret when configured', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, jwtRefreshSecret: 'refresh-secret' }[key]
    ));
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    const result = await mintTokenPair(TestUser, user);

    // Verifying with the access-token secret must fail — it was signed with refreshSecret instead.
    expect(() => new JwtService({ secret: 'secret' }).verify(result.refreshToken)).toThrow();
    const decoded =
      new JwtService({ secret: 'refresh-secret' }).verify(result.refreshToken) as Record<string, unknown>;
    expect(decoded).toMatchObject({ id: '1', email: 'u@test.co' });
  });

  it('should default additionalFields to an empty array when state has none configured', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, additionalRequestFields: undefined }[key]
    ));
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    const result = await mintTokenPair(TestUser, user);

    expect(decodePayload(result.accessToken)).toMatchObject({ id: '1', email: 'u@test.co' });
  });

  it('should sign the refresh token with an empty options object when neither refreshSecret nor refreshTokenExpiresIn are configured', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, jwtRefreshSecret: undefined, jwtRefreshTokenExpiresIn: undefined }[key]
    ));
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    const result = await mintTokenPair(TestUser, user);

    // Signed with the default (access-token) secret since no refreshSecret override was applied.
    const decoded = new JwtService({ secret: 'secret' }).verify(result.refreshToken) as Record<string, unknown>;
    expect(decoded).toMatchObject({ id: '1', email: 'u@test.co' });
  });

  it('should include additionalRequestFields from state in the payload', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, additionalRequestFields: ['role'] }[key]
    ));
    const user = { id: '1', email: 'u@test.co', role: 'admin' } as TestUser;

    const result = await mintTokenPair(TestUser, user);

    expect(decodePayload(result.accessToken)).toMatchObject({ id: '1', email: 'u@test.co', role: 'admin' });
  });

  it('should override loginField and additionalFields via options', async () => {
    const user = { id: '1', username: 'u', role: 'admin', email: undefined } as unknown as TestUser;

    const result = await mintTokenPair(TestUser, user, { loginField: 'username', additionalFields: ['role'] });

    const payload = decodePayload(result.accessToken);
    expect(payload).toMatchObject({ id: '1', username: 'u', role: 'admin' });
    expect(payload.email).toBeUndefined();
  });

  it('should not persist a refresh-token record when refreshTokenField is not configured', async () => {
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    await mintTokenPair(TestUser, user);

    expect(getEntityModelSpy).not.toHaveBeenCalled();
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('should persist the hashed jti under refreshTokenField from state when the user has an id', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, refreshTokenField: 'refreshToken' }[key]
    ));
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    await mintTokenPair(TestUser, user);

    expect(getEntityModelSpy).toHaveBeenCalledWith(TestUser);
    expect(hashPasswordSpy).toHaveBeenCalledWith(expect.any(String));
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: '1' },
      { $set: { refreshToken: JSON.stringify({ currentHash: 'hashed-jti' }) } },
    );
    expect(updateOneExec).toHaveBeenCalled();
  });

  it('should prefer _id over id and use refreshTokenField from options over the state default', async () => {
    const user = { id: '1', _id: 'mongo-id', email: 'u@test.co' } as unknown as TestUser;

    await mintTokenPair(TestUser, user, { refreshTokenField: 'customField' });

    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: 'mongo-id' },
      { $set: { customField: JSON.stringify({ currentHash: 'hashed-jti' }) } },
    );
  });

  it('should hash an empty jti when the refresh token cannot be decoded into an object', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, refreshTokenField: 'refreshToken' }[key]
    ));
    vi.spyOn(JwtService.prototype, 'decode').mockReturnValueOnce(null);
    const user = { id: '1', email: 'u@test.co' } as TestUser;

    await mintTokenPair(TestUser, user);

    expect(hashPasswordSpy).toHaveBeenCalledWith('');
  });

  it('should skip refresh-token persistence when the user has neither _id nor id', async () => {
    mockStateGet.mockImplementation((key: string) => (
      { ...defaultState, refreshTokenField: 'refreshToken' }[key]
    ));
    const user = { email: 'u@test.co' } as TestUser;

    await mintTokenPair(TestUser, user);

    expect(getEntityModelSpy).not.toHaveBeenCalled();
  });
});
