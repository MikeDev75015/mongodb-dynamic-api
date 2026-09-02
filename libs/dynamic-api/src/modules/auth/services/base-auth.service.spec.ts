import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { Model, ObjectId, Schema } from 'mongoose';
import { DynamicApiModule } from '../../../dynamic-api.module';
import { BaseEntity } from '../../../models';
import { BcryptService, DynamicApiGlobalStateService } from '../../../services';
import { BaseAuthService } from './base-auth.service';

class User extends BaseEntity {
  login: string;

  pass: string;

  nickname: string;
}

describe('BaseAuthService', () => {
  let service: AuthService;
  let model: any;
  let jwtService: JwtService;
  let bcryptService: BcryptService;
  let spyBcriptHashPassword: Mock;
  let spyJwtSign: Mock;
  let spyBuildUserFields: Mock;
  let spyFindOneDocumentWithAbilityPredicate: Mock;
  let exec: Mock;

  const fakeDate = new Date();
  const fakeHash = 'fake-hash';
  const fakeEmail = 'fake-email';
  const fakeUserId = 'fake-id';
  const fakeLogin = 'fake-login';
  const fakePass = 'fake-pass';
  const fakeUser = {
    _id: fakeUserId as unknown as ObjectId,
    __v: 0,
    id: undefined,
    login: fakeEmail,
    pass: fakeHash,
    nickname: 'test',
    createdAt: fakeDate,
    updatedAt: fakeDate,
  };
  const fakeUserInstance = plainToInstance(User, {
    id: 'fake-id',
    ...fakeUser,
  });
  const fakeLoginBuilt = { id: fakeUser._id, login: fakeUser.login, nickname: fakeUser.nickname };
  const accessToken = 'fake-token';
  const resetPasswordToken = 'reset-pass-token';
  const newPassword = 'new-pass';
  const hashedPassword = 'hashed-pass';
  const fakeLoginField = 'login' as keyof User;
  const fakePasswordField = 'pass' as keyof User;
  const fakeEmailField = 'login' as keyof User;
  const fakeExpirationInMinutes = 1;
  const fakeBeforeRegisterCallback = vi.fn();
  const fakeRegisterCallback = vi.fn();
  const fakeLoginCallback = vi.fn();
  const fakeGetAccountCallback = vi.fn();
  const resetPasswordCallback = vi.fn();
  const beforeChangePasswordCallback = vi.fn();
  const changePasswordCallback = vi.fn();
  const fakeBeforeUpdateAccountCallback = vi.fn();
  const updateAccountCallback = vi.fn();

  class AuthService extends BaseAuthService<User> {
    // Real generated AuthService (auth.helper.ts) always sets this — needed since updateAccount's
    // write now goes through BaseService.updateOneDocument(this.entity, ...), which reads it to
    // check for @DerivedField metadata.
    protected entity = User;
    protected additionalRequestFields: (keyof User)[] = ['nickname'];
    protected loginField = fakeLoginField;
    protected passwordField = fakePasswordField;

    protected loginCallback = fakeLoginCallback;
    protected getAccountCallback = fakeGetAccountCallback;
    protected beforeRegisterCallback = fakeBeforeRegisterCallback;
    protected registerCallback = fakeRegisterCallback;
    protected beforeUpdateAccountCallback = fakeBeforeUpdateAccountCallback;

    protected resetPasswordOptions = {
      beforeChangePasswordCallback: beforeChangePasswordCallback,
      resetPasswordCallback: resetPasswordCallback,
      changePasswordCallback: changePasswordCallback,
      emailField: fakeEmailField,
      expirationInMinutes: fakeExpirationInMinutes,
    };

    constructor(
      protected readonly _: Model<any>,
      protected readonly jwtService: JwtService,
      protected readonly bcryptService: BcryptService,
      protected readonly otpModel?: Model<any>,
    ) {
      super(_, jwtService, bcryptService, otpModel);
    }
  }


  beforeEach(async () => {
    fakeGetAccountCallback.mockClear();
    exec = vi.fn();
    const lean = vi.fn(() => ({ exec }));
    model = {
      create: vi.fn(),
      find: vi.fn(() => ({ lean })),
      findOne: vi.fn(() => ({ lean })),
      findOneAndUpdate: vi.fn(() => ({ lean })),
      updateOne: vi.fn(() => ({ exec })),
      updateMany: vi.fn(() => ({ exec })),
      deleteOne: vi.fn(() => ({ exec })),
      deleteMany: vi.fn(() => ({ exec })),
      schema: {
        paths: {},
      } as Schema<any>
    };

    jwtService = {
      decode: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
    } as unknown as JwtService;
    bcryptService = {
      comparePassword: vi.fn(),
      hashPassword: vi.fn(),
    } as unknown as BcryptService;
    service = new AuthService(model, jwtService, bcryptService);

    spyBcriptHashPassword = vi.spyOn(bcryptService, 'hashPassword').mockResolvedValue(fakeHash);
    spyJwtSign = vi.spyOn(jwtService, 'sign');
    spyBuildUserFields = vi.spyOn<any, any>(service, 'buildUserFields');
    spyFindOneDocumentWithAbilityPredicate =
      vi.spyOn<any, any>(service, 'findOneDocumentWithAbilityPredicate');
    vi.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
  });

  describe('service methods', () => {
    it('should have validateUser method', () => {
      expect(service).toHaveProperty('validateUser');
    });

    it('should have login method', () => {
      expect(service).toHaveProperty('login');
    });

    it('should have register method', () => {
      expect(service).toHaveProperty('register');
    });

    it('should have getAccount method', () => {
      expect(service).toHaveProperty('getAccount');
    });

    it('should have changePassword method', () => {
      expect(service).toHaveProperty('changePassword');
    });

    it('should have resetPassword method', () => {
      expect(service).toHaveProperty('resetPassword');
    });

    it('should have refreshToken method', () => {
      expect(service).toHaveProperty('refreshToken');
    });
  });

  describe('refreshToken', () => {
    let spyDynamicApiModuleStateGet: Mock;
    let spyBcryptCompare: Mock;

    const refreshToken = 'fake-refresh-token';
    const fakeHash = 'fake-hashed-refresh';

    beforeEach(() => {
      spyJwtSign.mockReturnValue(accessToken);
      spyBuildUserFields.mockReturnValue(fakeLoginBuilt);
      spyDynamicApiModuleStateGet = vi.spyOn(DynamicApiModule.state, 'get');
      spyBcryptCompare = vi.spyOn(bcryptService, 'comparePassword');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should have logout method', () => {
      expect(service).toHaveProperty('logout');
    });

    describe('without refreshTokenField', () => {
      it('should return { accessToken, refreshToken } using default secret', async () => {
        spyDynamicApiModuleStateGet.mockReturnValue(undefined);
        spyJwtSign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

        const result = await service['refreshToken'](fakeUser);

        expect(result).toEqual({ accessToken, refreshToken });
        expect(spyBcryptCompare).not.toHaveBeenCalled();
        expect(model.findOne).not.toHaveBeenCalled();
      });

      it('should sign refresh token with custom expiresIn when jwtRefreshTokenExpiresIn is defined', async () => {
        spyDynamicApiModuleStateGet.mockImplementation((key?: string) => {
          if (key === 'jwtRefreshTokenExpiresIn') return '7d';
          return undefined;
        });
        spyJwtSign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

        const result = await service['refreshToken'](fakeUser);

        expect(spyJwtSign).toHaveBeenNthCalledWith(2, { ...fakeLoginBuilt, jti: expect.any(String) }, { expiresIn: '7d' });
        expect(result).toEqual({ accessToken, refreshToken });
      });

      it('should sign refresh token with custom refreshSecret when jwtRefreshSecret is defined', async () => {
        spyDynamicApiModuleStateGet.mockImplementation((key?: string) => {
          if (key === 'jwtRefreshSecret') return 'my-refresh-secret';
          return undefined;
        });
        spyJwtSign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

        await service['refreshToken'](fakeUser);

        expect(spyJwtSign).toHaveBeenNthCalledWith(2, { ...fakeLoginBuilt, jti: expect.any(String) }, { secret: 'my-refresh-secret' });
      });
    });

    describe('with refreshTokenField', () => {
      beforeEach(() => {
        service['refreshTokenField'] = 'nickname' as keyof User;
        spyDynamicApiModuleStateGet.mockReturnValue(undefined);
        spyJwtSign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);
      });

      it('should throw UnauthorizedException if no stored hash in DB', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: null });

        await expect(service['refreshToken'](fakeUser, 'some-token')).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });

      it('should throw UnauthorizedException if no rawToken provided', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash });

        await expect(service['refreshToken'](fakeUser, undefined)).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });

      it('should throw UnauthorizedException if hash comparison fails', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash });
        vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'some-jti' });
        spyBcryptCompare.mockResolvedValueOnce(false);

        await expect(service['refreshToken'](fakeUser, 'wrong-token')).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });

      it('should handle rawToken without jti (decode returns object without jti)', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: JSON.stringify({ currentHash: fakeHash }) });
        vi.spyOn(jwtService, 'decode').mockReturnValueOnce({});

        await expect(service['refreshToken'](fakeUser, 'token-without-jti')).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });

      it('should rotate via CAS on valid token', async () => {
        const jsonRecord = JSON.stringify({ currentHash: fakeHash });
        exec
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord })   // findOne
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord });  // CAS success
        vi.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })
          .mockReturnValueOnce({ jti: 'new-jti' });
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

        const result = await service['refreshToken'](fakeUser, 'valid-token');

        expect(spyBcryptCompare).toHaveBeenCalledWith('input-jti', fakeHash);
        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: fakeUser._id, nickname: jsonRecord },
          { $set: { nickname: JSON.stringify({ currentHash: 'new-hash' }) } },
          { new: false },
        );
        expect(model.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({ accessToken, refreshToken });
      });

      it('should support legacy plain hash format (backward compat)', async () => {
        exec
          .mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash })  // findOne (legacy)
          .mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash }); // CAS success
        vi.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })
          .mockReturnValueOnce({ jti: 'new-jti' });
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

        const result = await service['refreshToken'](fakeUser, 'valid-token');

        expect(spyBcryptCompare).toHaveBeenCalledWith('input-jti', fakeHash);
        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: fakeUser._id, nickname: fakeHash },
          { $set: { nickname: JSON.stringify({ currentHash: 'new-hash' }) } },
          { new: false },
        );
        expect(result).toEqual({ accessToken, refreshToken });
      });

      it('should use empty jti when decode returns null for new refreshToken in buildRotatedRecord', async () => {
        const jsonRecord = JSON.stringify({ currentHash: fakeHash });
        exec
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord })
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord });
        vi.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })  // decode rawToken
          .mockReturnValueOnce(null);                  // decode new refreshToken → null → jti=''
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('hash-empty-jti');

        await service['refreshToken'](fakeUser, 'valid-token');

        expect(spyBcriptHashPassword).toHaveBeenCalledWith('');
      });

      it('should use user.id fallback when user._id is absent', async () => {
        const userWithoutId = { ...fakeUser, _id: undefined as unknown as ObjectId, id: 'only-id' };
        const jsonRecord = JSON.stringify({ currentHash: fakeHash });
        exec
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord })
          .mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord });
        vi.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })
          .mockReturnValueOnce({ jti: 'new-jti' });
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

        await service['refreshToken'](userWithoutId as unknown as User, 'valid-token');

        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'only-id', nickname: jsonRecord },
          expect.anything(),
          expect.anything(),
        );
      });

      describe('rotate = false', () => {
        beforeEach(() => { service['rotate'] = false; });
        afterEach(() => { service['rotate'] = true; });

        it('should validate and return new pair without updating DB', async () => {
          const jsonRecord = JSON.stringify({ currentHash: fakeHash });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'input-jti' });
          spyBcryptCompare.mockResolvedValueOnce(true);

          const result = await service['refreshToken'](fakeUser, 'valid-token');

          expect(model.findOneAndUpdate).not.toHaveBeenCalled();
          expect(model.updateOne).not.toHaveBeenCalled();
          expect(result).toEqual({ accessToken, refreshToken });
        });

        it('should throw 401 on invalid token even when rotate=false', async () => {
          const jsonRecord = JSON.stringify({ currentHash: fakeHash });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: jsonRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'bad-jti' });
          spyBcryptCompare.mockResolvedValueOnce(false);

          await expect(service['refreshToken'](fakeUser, 'bad-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
          expect(model.findOneAndUpdate).not.toHaveBeenCalled();
        });
      });

      describe('reuseWindowMs > 0 (grace window)', () => {
        const cachedTokens = { accessToken: 'cached-access', refreshToken: 'cached-refresh' };
        const previousHash = 'prev-hash';
        const rotatedRecently = Date.now() - 3000;

        beforeEach(() => { service['reuseWindowMs'] = 10000; });
        afterEach(() => { service['reuseWindowMs'] = 0; });

        it('should return cached tokens when previous jti used within grace window', async () => {
          const graceRecord = JSON.stringify({
            currentHash: 'current-hash',
            previousHash,
            rotatedAt: rotatedRecently,
            cachedTokens,
          });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: graceRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'old-jti' });
          spyBcryptCompare
            .mockResolvedValueOnce(false)  // vs currentHash
            .mockResolvedValueOnce(true);  // vs previousHash

          const result = await service['refreshToken'](fakeUser, 'old-token');

          expect(result).toEqual(cachedTokens);
          expect(model.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('should throw 401 when previous jti used but grace window expired', async () => {
          const expiredRecord = JSON.stringify({
            currentHash: 'current-hash',
            previousHash,
            rotatedAt: Date.now() - 20000,
            cachedTokens,
          });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: expiredRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'old-jti' });
          spyBcryptCompare.mockResolvedValueOnce(false);

          await expect(service['refreshToken'](fakeUser, 'old-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });

        it('should throw 401 when previous jti used within window but hash does not match', async () => {
          const graceRecord = JSON.stringify({
            currentHash: 'current-hash',
            previousHash,
            rotatedAt: rotatedRecently,
            cachedTokens,
          });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: graceRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'wrong-jti' });
          spyBcryptCompare
            .mockResolvedValueOnce(false)  // vs currentHash
            .mockResolvedValueOnce(false); // vs previousHash

          await expect(service['refreshToken'](fakeUser, 'bad-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });

        it('should throw 401 when no previousHash in record', async () => {
          const noGraceRecord = JSON.stringify({ currentHash: 'current-hash' });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: noGraceRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'old-jti' });
          spyBcryptCompare.mockResolvedValueOnce(false);

          await expect(service['refreshToken'](fakeUser, 'old-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });

        it('should throw 401 when grace window matches but cachedTokens absent in record', async () => {
          // Record has previousHash + rotatedAt but no cachedTokens (e.g. migrated record)
          const noCacheRecord = JSON.stringify({
            currentHash: 'current-hash',
            previousHash,
            rotatedAt: rotatedRecently,
            // no cachedTokens
          });
          exec.mockResolvedValueOnce({ ...fakeUser, nickname: noCacheRecord });
          vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'old-jti' });
          spyBcryptCompare
            .mockResolvedValueOnce(false)  // vs currentHash
            .mockResolvedValueOnce(true);  // vs previousHash (matches)

          await expect(service['refreshToken'](fakeUser, 'old-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });

        it('should store previousHash + rotatedAt + cachedTokens in rotated record', async () => {
          const simpleRecord = JSON.stringify({ currentHash: fakeHash });
          exec
            .mockResolvedValueOnce({ ...fakeUser, nickname: simpleRecord })
            .mockResolvedValueOnce({ ...fakeUser, nickname: simpleRecord });
          vi.spyOn(jwtService, 'decode')
            .mockReturnValueOnce({ jti: 'input-jti' })
            .mockReturnValueOnce({ jti: 'new-jti' });
          spyBcryptCompare.mockResolvedValueOnce(true);
          spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

          await service['refreshToken'](fakeUser, 'valid-token');

          const casCall = model.findOneAndUpdate.mock.calls[0];
          const stored = JSON.parse(casCall[1].$set.nickname);
          expect(stored.currentHash).toBe('new-hash');
          expect(stored.previousHash).toBe(fakeHash);
          expect(stored.rotatedAt).toBeGreaterThan(0);
          expect(stored.cachedTokens).toEqual({ accessToken, refreshToken });
        });
      });

      describe('CAS race condition handling', () => {
        const cachedTokens = { accessToken: 'cached-access', refreshToken: 'cached-refresh' };
        const winnerRotatedAt = Date.now() - 1000;

        beforeEach(() => { service['reuseWindowMs'] = 10000; });
        afterEach(() => { service['reuseWindowMs'] = 0; });

        it('should return cached tokens from winner when CAS misses within grace window', async () => {
          const storedRecord = JSON.stringify({ currentHash: fakeHash });
          const winnerRecord = JSON.stringify({
            currentHash: 'winner-hash',
            previousHash: fakeHash,
            rotatedAt: winnerRotatedAt,
            cachedTokens,
          });
          exec
            .mockResolvedValueOnce({ ...fakeUser, nickname: storedRecord })  // first findOne
            .mockResolvedValueOnce(null)                                       // CAS miss
            .mockResolvedValueOnce({ ...fakeUser, nickname: winnerRecord });   // re-read
          vi.spyOn(jwtService, 'decode')
            .mockReturnValueOnce({ jti: 'input-jti' })
            .mockReturnValueOnce({ jti: 'new-jti' });
          spyBcryptCompare
            .mockResolvedValueOnce(true)    // vs storedRecord.currentHash (valid, proceed to rotate)
            .mockResolvedValueOnce(true);   // grace: winnerRecord.previousHash vs input-jti
          spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

          const result = await service['refreshToken'](fakeUser, 'valid-token');

          expect(result).toEqual(cachedTokens);
        });

        it('should throw 401 when CAS misses and grace window expired in winner record', async () => {
          const storedRecord = JSON.stringify({ currentHash: fakeHash });
          const expiredWinner = JSON.stringify({
            currentHash: 'winner-hash',
            previousHash: fakeHash,
            rotatedAt: Date.now() - 20000,
            cachedTokens,
          });
          exec
            .mockResolvedValueOnce({ ...fakeUser, nickname: storedRecord })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ ...fakeUser, nickname: expiredWinner });
          vi.spyOn(jwtService, 'decode')
            .mockReturnValueOnce({ jti: 'input-jti' })
            .mockReturnValueOnce({ jti: 'new-jti' });
          spyBcryptCompare.mockResolvedValueOnce(true);
          spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

          await expect(service['refreshToken'](fakeUser, 'valid-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });

        it('should throw 401 when CAS misses and re-read returns null stored value', async () => {
          const storedRecord = JSON.stringify({ currentHash: fakeHash });
          exec
            .mockResolvedValueOnce({ ...fakeUser, nickname: storedRecord })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);  // user gone
          vi.spyOn(jwtService, 'decode')
            .mockReturnValueOnce({ jti: 'input-jti' })
            .mockReturnValueOnce({ jti: 'new-jti' });
          spyBcryptCompare.mockResolvedValueOnce(true);
          spyBcriptHashPassword.mockResolvedValueOnce('new-hash');

          await expect(service['refreshToken'](fakeUser, 'valid-token')).rejects.toThrow(
            new UnauthorizedException('Invalid refresh token'),
          );
        });
      });
    });
  });

  describe('extractIncomingJti (private)', () => {
    it('should return undefined when rawToken is absent', () => {
      expect(service['extractIncomingJti'](undefined)).toBeUndefined();
    });

    it('should return undefined when decode returns null', () => {
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce(null);
      expect(service['extractIncomingJti']('some-token')).toBeUndefined();
    });

    it('should return undefined when decode returns a plain string', () => {
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce('plain-string');
      expect(service['extractIncomingJti']('some-token')).toBeUndefined();
    });

    it('should return undefined when decoded object has no jti', () => {
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ sub: '123' });
      expect(service['extractIncomingJti']('some-token')).toBeUndefined();
    });

    it('should return jti when decoded object has jti', () => {
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'abc-jti' });
      expect(service['extractIncomingJti']('some-token')).toBe('abc-jti');
    });
  });

  describe('handleInvalidCurrentJti (private)', () => {
    const userId = 'user-123';

    afterEach(() => vi.restoreAllMocks());

    it('should return cached tokens when grace window is valid', async () => {
      const cachedTokens = { accessToken: 'a', refreshToken: 'r' };
      vi.spyOn<any, any>(service as any, 'checkGraceWindow').mockResolvedValueOnce(cachedTokens);

      const result = await service['handleInvalidCurrentJti']('jti', { currentHash: 'h' }, userId);

      expect(result).toEqual(cachedTokens);
    });

    it('should throw UnauthorizedException when grace window returns null', async () => {
      vi.spyOn<any, any>(service as any, 'checkGraceWindow').mockResolvedValueOnce(null);

      await expect(service['handleInvalidCurrentJti']('jti', { currentHash: 'h' }, userId))
        .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('handleCasMiss (private)', () => {
    const userId = 'user-456';

    beforeEach(() => {
      service['refreshTokenField'] = 'nickname' as keyof User;
    });

    afterEach(() => vi.restoreAllMocks());

    it('should return cached tokens when re-read record is within grace window', async () => {
      const cachedTokens = { accessToken: 'ca', refreshToken: 'cr' };
      const rereadRecord = { currentHash: 'h2', previousHash: 'prev', rotatedAt: Date.now() - 500, cachedTokens };
      exec.mockResolvedValueOnce({ ...fakeUser, nickname: JSON.stringify(rereadRecord) });
      vi.spyOn<any, any>(service as any, 'checkGraceWindow').mockResolvedValueOnce(cachedTokens);

      const result = await service['handleCasMiss'](userId, 'jti');

      expect(result).toEqual(cachedTokens);
    });

    it('should throw when re-read record grace window returns null', async () => {
      exec.mockResolvedValueOnce({ ...fakeUser, nickname: JSON.stringify({ currentHash: 'h2' }) });
      vi.spyOn<any, any>(service as any, 'checkGraceWindow').mockResolvedValueOnce(null);

      await expect(service['handleCasMiss'](userId, 'jti'))
        .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should throw when re-read user has no stored value', async () => {
      exec.mockResolvedValueOnce({ ...fakeUser, nickname: null });

      await expect(service['handleCasMiss'](userId, 'jti'))
        .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('should throw when re-read user not found', async () => {
      exec.mockResolvedValueOnce(null);

      await expect(service['handleCasMiss'](userId, 'jti'))
        .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('logout', () => {
    let spyLoggerWarn: Mock;

    beforeEach(() => {
      spyLoggerWarn = vi.spyOn<any, any>(service['logger'], 'warn').mockImplementation(vi.fn());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log warning when refreshTokenField is not configured', async () => {
      service['refreshTokenField'] = undefined;
      await service['logout'](fakeUser);

      expect(spyLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('refreshTokenField'));
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('should clear refreshTokenField in DB when configured', async () => {
      service['refreshTokenField'] = 'nickname' as keyof User;

      await service['logout'](fakeUser);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: fakeUser._id },
        { $set: { nickname: null } },
      );
      expect(spyLoggerWarn).not.toHaveBeenCalled();
    });

    it('should use user.id as fallback when user._id is absent in logout', async () => {
      service['refreshTokenField'] = 'nickname' as keyof User;
      const userWithoutId = { ...fakeUser, _id: undefined as unknown as ObjectId, id: 'only-id' };

      await service['logout'](userWithoutId as unknown as User);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: 'only-id' },
        { $set: { nickname: null } },
      );
    });
  });

  describe('validateUser', () => {
    let spyBcryptCompare: Mock;

    beforeEach(() => {
      spyBcryptCompare = vi.spyOn(bcryptService, 'comparePassword');
    });

    it('should return null if user is not found', async () => {
      exec.mockResolvedValueOnce(null);
      const result = await service['validateUser'](fakeLogin, fakePass);

      expect(model.findOne).toHaveBeenCalledWith({ [fakeLoginField]: fakeLogin });
      expect(spyBcryptCompare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if password is not valid', async () => {
      exec.mockResolvedValueOnce(fakeUser);
      spyBcryptCompare.mockResolvedValueOnce(false);
      const result = await service['validateUser'](fakeLogin, fakePass);

      expect(spyBcryptCompare).toHaveBeenCalledWith(fakePass, fakeUser.pass);
      expect(result).toBeNull();
    });

    it('should return user if password is valid', async () => {
      exec.mockResolvedValueOnce(fakeUser);
      spyBcryptCompare.mockResolvedValueOnce(true);
      const result = await service['validateUser'](fakeLogin, fakePass);
      expect(result).toEqual({ ...fakeUser, id: fakeUser._id.toString() });
    });
  });

  describe('login', () => {
    const fakeRefreshToken = 'fake-refresh-token';

    beforeEach(() => {
      spyJwtSign.mockReturnValueOnce(accessToken).mockReturnValueOnce(fakeRefreshToken);
      spyBuildUserFields.mockReturnValueOnce(fakeLoginBuilt);
      vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(undefined);
    });

    it('should return { accessToken, refreshToken } and call loginCallback if defined and login is not call from member', async () => {
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      const result = await service['login'](fakeUser);

      expect(spyBuildUserFields)
      .toHaveBeenCalledWith(fakeUser, ['_id', 'id', fakeLoginField, ...service['additionalRequestFields']]);
      expect(fakeLoginCallback).toHaveBeenCalledTimes(1);
      expect(fakeLoginCallback).toHaveBeenCalledWith(
        fakeUserInstance,
        service['callbackMethods'],
      );
      expect(spyJwtSign).toHaveBeenNthCalledWith(1, fakeLoginBuilt);
      expect(result).toEqual({ accessToken, refreshToken: fakeRefreshToken });
    });

    it('should return { accessToken, refreshToken } and not call loginCallback if defined but login is called from member', async () => {
      const result = await service['login'](fakeUser, true);

      expect(service['loginCallback']).not.toHaveBeenCalled();
      expect(result).toEqual({ accessToken, refreshToken: fakeRefreshToken });
    });

    it('should return { accessToken, refreshToken } and not call loginCallback if not defined', async () => {
      service['loginCallback'] = undefined;
      const result = await service['login'](fakeUser);

      expect(fakeLoginCallback).not.toHaveBeenCalled();
      expect(result).toEqual({ accessToken, refreshToken: fakeRefreshToken });
    });

    it('should store hashed refresh token in DB when refreshTokenField is configured', async () => {
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'fake-jti' });
      service['refreshTokenField'] = 'nickname' as keyof User;
      spyBcriptHashPassword.mockResolvedValueOnce('hashed-refresh');

      await service['login'](fakeUser);

      expect(spyBcriptHashPassword).toHaveBeenCalledWith('fake-jti');
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: fakeUser._id },
        { $set: { nickname: JSON.stringify({ currentHash: 'hashed-refresh' }) } },
      );
      service['refreshTokenField'] = undefined;
    });

    it('should not store refresh token when refreshTokenField is not configured', async () => {
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      service['refreshTokenField'] = undefined;

      await service['login'](fakeUser);

      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('should store hashed refresh token using user.id when user._id is absent', async () => {
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'fake-jti' });
      service['refreshTokenField'] = 'nickname' as keyof User;
      spyBcriptHashPassword.mockResolvedValueOnce('hashed-refresh');
      const userWithoutId = { ...fakeUser, _id: undefined as unknown as ObjectId, id: 'only-id' };

      await service['login'](userWithoutId as unknown as User);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: 'only-id' },
        { $set: { nickname: JSON.stringify({ currentHash: 'hashed-refresh' }) } },
      );
      service['refreshTokenField'] = undefined;
    });

    it('should store hash with empty jti when decode returns null for refreshToken', async () => {
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      // decode returns null (defensive branch)
      vi.spyOn(jwtService, 'decode').mockReturnValueOnce(null);
      service['refreshTokenField'] = 'nickname' as keyof User;
      spyBcriptHashPassword.mockResolvedValueOnce('hash-empty');

      await service['login'](fakeUser);

      expect(spyBcriptHashPassword).toHaveBeenCalledWith('');
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: fakeUser._id },
        { $set: { nickname: JSON.stringify({ currentHash: 'hash-empty' }) } },
      );
      service['refreshTokenField'] = undefined;
    });
  });

  describe('register', () => {
    let spyLogin: Mock;
    let spyHandleDuplicateKeyError: Mock;
    let spyCheckFieldsValidity: Mock;

    const userToCreate = {
      login: fakeLogin,
      pass: fakePass,
    };

    beforeEach(() => {
      spyCheckFieldsValidity = vi.spyOn<any, any>(service, 'checkFieldsValidity');
      spyLogin = vi.spyOn<any, any>(service, 'login').mockReturnValueOnce({ accessToken, refreshToken: 'fake-refresh' });
      exec.mockResolvedValueOnce(fakeUser);
      spyHandleDuplicateKeyError = vi.spyOn<any, any>(service, 'handleDuplicateKeyError');
    });

    it('should return token and call registerCallback if it is defined', async () => {
      service['beforeRegisterCallback'] = undefined;
      model.create.mockResolvedValueOnce(fakeUser);
      exec.mockResolvedValueOnce(fakeUser);
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      const result = await service['register'](userToCreate);

      expect(spyCheckFieldsValidity).toHaveBeenCalledWith(userToCreate);
      expect(spyBcriptHashPassword).toHaveBeenCalledWith(userToCreate.pass);
      expect(model.create).toHaveBeenCalledWith({ ...userToCreate, pass: fakeHash });
      expect(model.findOne).toHaveBeenCalledWith({ _id: fakeUser._id });
      expect(fakeRegisterCallback).toHaveBeenCalledTimes(1);
      expect(fakeRegisterCallback).toHaveBeenCalledWith(fakeUserInstance, service['callbackMethods']);
      expect(fakeBeforeRegisterCallback).not.toHaveBeenCalled();
      expect(spyLogin).toHaveBeenCalledWith(fakeUser, true);
      expect(result).toEqual({ accessToken, refreshToken: 'fake-refresh' });
    });

    it('should return token and not call registerCallback if it is not defined', async () => {
      service['beforeRegisterCallback'] = undefined;
      service['registerCallback'] = undefined;
      model.create.mockResolvedValueOnce(fakeUser);
      await service['register'](userToCreate);

      expect(fakeBeforeRegisterCallback).not.toHaveBeenCalled();
      expect(fakeRegisterCallback).not.toHaveBeenCalled();
    });

    it('should return token and call beforeRegisterCallback if it is defined', async () => {
      model.create.mockResolvedValueOnce(fakeUser);
      exec.mockResolvedValueOnce(fakeUser);
      vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      await service['register'](userToCreate);

      expect(fakeBeforeRegisterCallback).toHaveBeenCalledTimes(1);
      expect(fakeBeforeRegisterCallback).toHaveBeenCalledWith(
        { ...userToCreate },
        { hashedPassword: fakeHash },
        service['callbackMethods'],
      );
    });

    it('should throw a service unavailable exception if create fails', async () => {
      const fakeError = new Error('fake-error');
      model.create.mockRejectedValueOnce(fakeError);

      await expect(() => service['register'](userToCreate))
      .rejects
      .toThrow(new ServiceUnavailableException(fakeError.message));
      expect(spyHandleDuplicateKeyError).toHaveBeenCalledTimes(1);
      expect(spyHandleDuplicateKeyError).toHaveBeenCalledWith(fakeError, false);
      expect(spyFindOneDocumentWithAbilityPredicate).not.toHaveBeenCalled();
      expect(fakeRegisterCallback).not.toHaveBeenCalled();
      expect(spyLogin).not.toHaveBeenCalled();
    });

    it('should throw a conflict exception if user already exists', async () => {
      const fakeDuplicateKeyError = { code: 11000, keyValue: { login: 'test' } };
      model.create.mockRejectedValueOnce(fakeDuplicateKeyError);

      await expect(() => service['register'](userToCreate))
      .rejects
      .toThrow(new ConflictException('login \'test\' is already used'));
      expect(spyHandleDuplicateKeyError).toHaveBeenCalledTimes(1);
      expect(spyHandleDuplicateKeyError).toHaveBeenCalledWith(fakeDuplicateKeyError, false);
    });
  });

  describe('getAccount', () => {
    const fakeUserId = 'fake-id';

    beforeEach(() => {
      exec.mockResolvedValueOnce({ ...fakeUser, id: fakeUserId });
      spyBuildUserFields.mockReturnValueOnce(fakeLoginBuilt);
    });

    it('should return user with only login and additional fields', async () => {
      const result = await service['getAccount']({ id: fakeUserId } as User);

      expect(model.findOne).toHaveBeenCalledWith({ _id: fakeUserId });
      expect(spyBuildUserFields)
      .toHaveBeenCalledWith(
        { ...fakeUser, id: fakeUserId },
        ['_id', fakeLoginField, ...service['additionalRequestFields']],
      );
      expect(result).toEqual(fakeLoginBuilt);
    });

    it('should call getAccountCallback before building response fields', async () => {
      const spyBuildInstance = vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      await service['getAccount']({ id: fakeUserId } as User);

      expect(spyBuildInstance).toHaveBeenCalledWith({ ...fakeUser, id: fakeUserId });
      expect(fakeGetAccountCallback).toHaveBeenCalledTimes(1);
      expect(fakeGetAccountCallback).toHaveBeenCalledWith(fakeUserInstance, service['callbackMethods']);
      expect(spyBuildUserFields).toHaveBeenCalledTimes(1);
      expect(spyBuildInstance.mock.invocationCallOrder[0]).toBeLessThan(spyBuildUserFields.mock.invocationCallOrder[0]);
    });

    it('should not call getAccountCallback when it is undefined', async () => {
      service['getAccountCallback'] = undefined;
      await service['getAccount']({ id: fakeUserId } as User);

      expect(fakeGetAccountCallback).not.toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    let spyBuildInstance: Mock;
    let spyGetAccount: Mock;

    const fakeUserId = 'fake-id';
    const update = { nickname: 'new-nickname' };

    beforeEach(() => {
      spyGetAccount = vi.spyOn<any, any>(service, 'getAccount').mockResolvedValueOnce(fakeUser);
      spyBuildInstance = vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
    });

    it('should update user and return getAccount response', async () => {
      service['beforeUpdateAccountCallback'] = undefined;
      service['updateAccountCallback'] = undefined;
      await service['updateAccount']({ id: fakeUserId } as User, update);

      expect(model.updateOne).toHaveBeenCalledWith({ _id: fakeUserId }, { $set: update });
      expect(spyBuildInstance).not.toHaveBeenCalled();
      expect(spyGetAccount).toHaveBeenCalledWith({ id: fakeUserId });
    });

    it('should update user and call updateCallback if it is defined', async () => {
      service['beforeUpdateAccountCallback'] = undefined;
      service['updateAccountCallback'] = updateAccountCallback;
      exec.mockResolvedValueOnce(undefined).mockResolvedValueOnce(fakeUser);
      const result = await service['updateAccount']({ id: fakeUserId } as User, update);

      expect(spyBuildInstance).toHaveBeenCalledWith(fakeUser);
      expect(updateAccountCallback).toHaveBeenCalledTimes(1);
      expect(updateAccountCallback).toHaveBeenCalledWith(fakeUserInstance, service['callbackMethods']);
      expect(spyGetAccount).toHaveBeenCalledWith({ id: fakeUserId });
      expect(result).toEqual(fakeUser);
    });

    it('should update user and call beforeUpdateCallback if it is defined', async () => {
      service['beforeUpdateAccountCallback'] = fakeBeforeUpdateAccountCallback;
      service['updateAccountCallback'] = undefined;
      exec.mockResolvedValueOnce(fakeUser).mockResolvedValueOnce(undefined).mockResolvedValueOnce(fakeUser);
      await service['updateAccount']({ id: fakeUserId } as User, update);

      expect(fakeBeforeUpdateAccountCallback).toHaveBeenCalledTimes(1);
      expect(fakeBeforeUpdateAccountCallback).toHaveBeenCalledWith(
        { ...fakeUser, id: fakeUserId },
        { update },
        service['callbackMethods'],
      );
    });

    describe('with refreshTokenOnUpdate = true', () => {
      let spyLogin: Mock;

      beforeEach(() => {
        service['refreshTokenOnUpdate'] = true;
        service['beforeUpdateAccountCallback'] = undefined;
        service['updateAccountCallback'] = undefined;
        spyLogin = vi.spyOn<any, any>(service, 'login').mockResolvedValueOnce({ accessToken, refreshToken: 'fresh-rt' });
      });

      afterEach(() => {
        service['refreshTokenOnUpdate'] = false;
      });

      it('should return LoginResponse when refreshTokenOnUpdate is true', async () => {
        exec.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ...fakeUser, _id: fakeUserId });

        const result = await service['updateAccount']({ id: fakeUserId } as User, update);

        expect(model.updateOne).toHaveBeenCalledWith({ _id: fakeUserId }, { $set: update });
        expect(spyLogin).toHaveBeenCalledWith(
          { ...fakeUser, _id: fakeUserId, id: fakeUserId },
          true,
        );
        expect(result).toEqual({ accessToken, refreshToken: 'fresh-rt' });
        expect(spyGetAccount).not.toHaveBeenCalled();
      });

      it('should not call getAccount when refreshTokenOnUpdate is true', async () => {
        exec.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ...fakeUser, _id: fakeUserId });

        await service['updateAccount']({ id: fakeUserId } as User, update);

        expect(spyGetAccount).not.toHaveBeenCalled();
      });

      it('should still call updateAccountCallback before refreshing token', async () => {
        service['updateAccountCallback'] = updateAccountCallback;
        exec
          .mockResolvedValueOnce(undefined)          // updateOne
          .mockResolvedValueOnce({ ...fakeUser, _id: fakeUserId })  // findOne for callback
          .mockResolvedValueOnce({ ...fakeUser, _id: fakeUserId }); // findOne for login
        spyBuildInstance.mockReturnValueOnce(fakeUserInstance);

        await service['updateAccount']({ id: fakeUserId } as User, update);

        expect(updateAccountCallback).toHaveBeenCalledTimes(1);
        expect(updateAccountCallback).toHaveBeenCalledWith(fakeUserInstance, service['callbackMethods']);
        expect(spyLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('resetPassword', () => {
    it('should not generate token if resetPasswordOptions is not defined', async () => {
      service['resetPasswordOptions'] = undefined;
      await service['resetPassword'](fakeEmail);

      expect(service['resetPasswordCallbackMethods']).toBeUndefined();
      expect(spyJwtSign).not.toHaveBeenCalled();
      expect(resetPasswordCallback).not.toHaveBeenCalled();
    });

    it('should generate token if resetPasswordOptions is defined and call resetPasswordCallback', async () => {
      spyJwtSign.mockReturnValueOnce(resetPasswordToken);
      await service['resetPassword'](fakeEmail);

      expect(service['resetPasswordCallbackMethods']).toStrictEqual({
        findUserByEmail: expect.any(Function),
        updateUserByEmail: expect.any(Function),
      });
      expect(spyJwtSign).toHaveBeenCalledTimes(1);
      expect(spyJwtSign)
      .toHaveBeenCalledWith({ email: fakeEmail }, { expiresIn: fakeExpirationInMinutes * 60 });
      expect(resetPasswordCallback).toHaveBeenCalledTimes(1);
      expect(resetPasswordCallback)
      .toHaveBeenCalledWith(
        { resetPasswordToken, email: fakeEmail },
        service['resetPasswordCallbackMethods'],
      );
    });

    describe('resetPasswordCallbackMethods', () => {
      beforeEach(async () => {
        spyJwtSign.mockReturnValueOnce(resetPasswordToken);
        await service['resetPassword'](fakeEmail);
        vi.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      });

      it('should find user by email', async () => {
        exec.mockResolvedValueOnce(fakeUser);
        const result = await service['resetPasswordCallbackMethods'].findUserByEmail();

        expect(model.findOne).toHaveBeenCalledWith({ [fakeEmailField]: fakeEmail });
        expect(result).toEqual(fakeUserInstance);
      });

      it('should be undefined if user is not found', async () => {
        exec.mockResolvedValueOnce(null);
        const result = await service['resetPasswordCallbackMethods'].findUserByEmail();

        expect(model.findOne).toHaveBeenCalledTimes(1);
        expect(model.findOne).toHaveBeenCalledWith({ [fakeEmailField]: fakeEmail });
        expect(result).toBeUndefined();
      });

      it('should update user by email', async () => {
        exec.mockResolvedValueOnce(fakeUser);
        const result = await service['resetPasswordCallbackMethods'].updateUserByEmail({ pass: fakeHash });

        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { [fakeEmailField]: fakeEmail },
          { pass: fakeHash },
          { new: true },
        );
        expect(result).toEqual(fakeUserInstance);
      });

      it('should not update user if user is not found', async () => {
        exec.mockResolvedValueOnce(null);
        const result = await service['resetPasswordCallbackMethods'].updateUserByEmail({ pass: fakeHash });

        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { [fakeEmailField]: fakeEmail },
          { pass: fakeHash },
          { new: true },
        );
        expect(result).toBeUndefined();
      });
    });
  });

  describe('changePassword', () => {
    let spyJwtDecode: Mock;
    let spyDateNow: Mock;
    let spyMathRound: Mock;
    let spyLoggerWarn: Mock;

    const fakeDecodedToken = { email: fakeUser.login, exp: 1000 };

    beforeEach(() => {
      spyJwtDecode = vi.spyOn(jwtService, 'decode');
      spyDateNow = vi.spyOn(Date, 'now');
      spyMathRound = vi.spyOn(Math, 'round');
      spyLoggerWarn = vi.spyOn<any, any>(service['logger'], 'warn').mockImplementation(vi.fn());
    });

    it('should throw bad request if token is invalid', async () => {
      await expect(service['changePassword'](resetPasswordToken, newPassword)).rejects.toThrow(
        new BadRequestException('Invalid reset password token. Please redo the reset password process.'),
      );
      expect(spyJwtDecode).toHaveBeenCalledTimes(1);
      expect(spyJwtDecode).toHaveBeenCalledWith(resetPasswordToken);
      expect(spyLoggerWarn).toHaveBeenCalledTimes(1);
      expect(spyLoggerWarn).toHaveBeenCalledWith('Invalid reset password token');
      expect(spyMathRound).not.toHaveBeenCalled();
    });

    it('should throw unauthorized if token is expired', async () => {
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 2000000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyMathRound.mockReturnValueOnce(fakeTimestamp / 1000);

      await expect(() => service['changePassword'](resetPasswordToken, newPassword)).rejects.toThrow(
        new UnauthorizedException('Time to reset password has expired. Please redo the reset password process.'),
      );
      expect(spyDateNow).toHaveBeenCalledTimes(1);
      expect(spyMathRound).toHaveBeenCalledTimes(1);
      expect(spyMathRound).toHaveBeenCalledWith(fakeTimestamp / 1000);
      expect(spyFindOneDocumentWithAbilityPredicate).not.toHaveBeenCalled();
      expect(spyLoggerWarn).not.toHaveBeenCalled();
    });

    it('should throw forbidden if ability predicate is false', async () => {
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockImplementationOnce(() => {
        throw new ForbiddenException('Access denied');
      });

      await expect(() => service['changePassword'](resetPasswordToken, newPassword)).rejects.toThrow(
        new ForbiddenException('You are not allowed to change your password.'),
      );
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledTimes(1);
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledWith(
        undefined,
        { [fakeEmailField]: fakeUser.login },
        undefined,
      );
      expect(spyLoggerWarn).not.toHaveBeenCalled();
    });

    it('should not change password if user is not found', async () => {
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(undefined);

      await service['changePassword'](resetPasswordToken, newPassword);

      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledWith(
        undefined,
        { [fakeEmailField]: fakeUser.login },
        undefined,
      );
      expect(spyLoggerWarn).toHaveBeenCalledTimes(1);
      expect(spyLoggerWarn).toHaveBeenCalledWith('Invalid email, user not found');
      expect(spyBcriptHashPassword).not.toHaveBeenCalled();
    });

    it('should change password and call changePasswordCallback if defined', async () => {
      service['resetPasswordOptions'].beforeChangePasswordCallback = undefined;
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(fakeUser);
      exec.mockResolvedValueOnce(fakeUser);
      spyBcriptHashPassword.mockResolvedValueOnce(hashedPassword);
      vi.spyOn(bcryptService, 'hashPassword').mockResolvedValueOnce(hashedPassword);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledTimes(1);
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenNthCalledWith(
        1,
        undefined,
        { [fakeEmailField]: fakeUser.login },
        undefined,
      );
      expect(spyBcriptHashPassword).toHaveBeenCalledWith(newPassword);
      expect(model.updateOne)
      .toHaveBeenCalledWith(
        { _id: fakeUser._id },
        { $set: { [fakePasswordField]: hashedPassword, resetPasswordToken: null } },
      );
      expect(changePasswordCallback).toHaveBeenCalledTimes(1);
      expect(changePasswordCallback)
      .toHaveBeenCalledWith({ ...fakeUser, id: fakeUser._id.toString() }, service['callbackMethods']);
    });

    it('should change password and not call changePasswordCallback if not defined', async () => {
      service['resetPasswordOptions'].beforeChangePasswordCallback = undefined;
      service['resetPasswordOptions'].changePasswordCallback = undefined;
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(fakeUser);
      spyBcriptHashPassword.mockResolvedValueOnce(hashedPassword);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(changePasswordCallback).not.toHaveBeenCalled();
    });

    it('should change password and call beforeChangePasswordCallback if defined', async () => {
      service['resetPasswordOptions'].changePasswordCallback = undefined;
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      exec.mockResolvedValueOnce(fakeUser);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(fakeUser);
      spyBcriptHashPassword.mockResolvedValueOnce(hashedPassword);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(beforeChangePasswordCallback).toHaveBeenCalledTimes(1);
      expect(beforeChangePasswordCallback)
      .toHaveBeenCalledWith(
        { ...fakeUser, id: fakeUser._id.toString() },
        { resetPasswordToken, newPassword, hashedPassword },
        service['callbackMethods'],
      );
    });
  });

  describe('buildUserFields', () => {
    it('should build user fields', () => {
      const result = service['buildUserFields'](fakeUser, ['login', 'nickname']);

      expect(result).toEqual({ login: fakeUser.login, nickname: fakeUser.nickname });
    });

    it('should build user fields without undefined fields', () => {
      const result = service['buildUserFields'](
        { ...fakeUser, nickname: undefined },
        ['login', 'nickname'],
      );

      expect(result).toEqual({ login: fakeUser.login });
    });
  });

  describe('checkFieldsValidity', () => {
    it('should not throw if user to create has login and password fields', () => {
      const userToCreate = { login: fakeLogin, pass: fakePass };

      expect(() => service['checkFieldsValidity'](userToCreate)).not.toThrow();
    });

    it('should throw bad request if user to create does not have login field', () => {
      const userToCreate = { pass: fakePass };

      expect(() => service['checkFieldsValidity'](userToCreate))
      .toThrow(new BadRequestException([`${fakeLoginField} property is required`]));
    });

    it('should throw bad request if user to create does not have password field', () => {
      const userToCreate = { login: fakeLogin };

      expect(() => service['checkFieldsValidity'](userToCreate))
      .toThrow(new BadRequestException([`${fakePasswordField} property is required`]));
    });

    it('should throw bad request if user to create has no fields', () => {
      expect(() => service['checkFieldsValidity']({})).toThrow(
        new BadRequestException([`${fakeLoginField} property is required`, `${fakePasswordField} property is required`]),
      );
    });
  });

  describe('sendOtpCode', () => {
    const identifier = 'user@test.co';
    const plainCode = '123456';
    const fakeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const sendCodeCallback = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      spyBcriptHashPassword.mockResolvedValue(fakeHash);
    });

    afterEach(() => {
      sendCodeCallback.mockClear();
    });

    it('should do nothing if passwordlessOptions is not set', async () => {
      await service.sendOtpCode(identifier);

      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
      expect(sendCodeCallback).not.toHaveBeenCalled();
    });

    describe('with passwordlessOptions configured', () => {
      let serviceWithPasswordless: AuthService;
      let otpModel: { findOneAndUpdate: Mock; findOne: Mock; deleteOne: Mock };

      beforeEach(() => {
        otpModel = {
          findOneAndUpdate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
          findOne: vi.fn().mockReturnValue({ exec: vi.fn() }),
          deleteOne: vi.fn().mockReturnValue({ exec: vi.fn() }),
        };

        serviceWithPasswordless = new AuthService(
          model,
          jwtService,
          bcryptService,
          otpModel as any,
        );
        serviceWithPasswordless['passwordlessOptions'] = {
          otpExpirationMinutes: 5,
          sendCodeCallback,
        };
      });

      it('should hash code, upsert OTP doc, and call sendCodeCallback', async () => {
        vi.spyOn(global.Math, 'random').mockReturnValue(0.123456);

        await serviceWithPasswordless.sendOtpCode(identifier);

        expect(spyBcriptHashPassword).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/));
        expect(otpModel.findOneAndUpdate).toHaveBeenCalledWith(
          { identifier },
          expect.objectContaining({ identifier, hashedCode: fakeHash }),
          { upsert: true, new: true },
        );
        expect(sendCodeCallback).toHaveBeenCalledWith(identifier, expect.stringMatching(/^\d{6}$/));

        vi.spyOn(global.Math, 'random').mockRestore();
      });

      it('should use custom generateCode when provided', async () => {
        serviceWithPasswordless['passwordlessOptions'] = {
          otpExpirationMinutes: 5,
          generateCode: () => 'ABCDEF',
          sendCodeCallback,
        };

        await serviceWithPasswordless.sendOtpCode(identifier);

        expect(sendCodeCallback).toHaveBeenCalledWith(identifier, 'ABCDEF');
      });

      it('should throw BadRequestException if identifier is undefined', async () => {
        await expect(serviceWithPasswordless.sendOtpCode(undefined)).rejects.toThrow();
      });
    });
  });

  describe('verifyOtpCode', () => {
    const identifier = 'user@test.co';
    const plainCode = '123456';
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const pastDate = new Date(Date.now() - 60 * 1000);
    const tokenResult = { accessToken: 'at', refreshToken: 'rt' };

    let serviceWithPasswordless: AuthService;
    let otpModel: { findOneAndUpdate: Mock; findOne: Mock; deleteOne: Mock };
    let spyBcryptCompare: Mock;

    beforeEach(() => {
      otpModel = {
        findOneAndUpdate: vi.fn().mockReturnValue({ exec: vi.fn() }),
        findOne: vi.fn().mockReturnValue({ exec: vi.fn() }),
        deleteOne: vi.fn().mockReturnValue({ exec: vi.fn() }),
      };

      serviceWithPasswordless = new AuthService(
        model,
        jwtService,
        bcryptService,
        otpModel as any,
      );
      serviceWithPasswordless['passwordlessOptions'] = {
        otpExpirationMinutes: 10,
        sendCodeCallback: vi.fn(),
      };

      spyBcryptCompare = vi.spyOn(bcryptService, 'comparePassword');
      spyBuildUserFields.mockReturnValue(fakeLoginBuilt);
      spyJwtSign.mockReturnValue('fake-token');
    });

    it('should return tokens when OTP is valid and user exists', async () => {
      otpModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ identifier, hashedCode: fakeHash, expiresAt: futureDate }),
      });
      spyBcryptCompare.mockResolvedValue(true);
      exec.mockResolvedValue({ ...fakeUser, login: identifier, _id: fakeUserId });
      vi.spyOn(bcryptService, 'hashPassword').mockResolvedValue('hashed-jti');
      otpModel.deleteOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(undefined);

      const result = await serviceWithPasswordless.verifyOtpCode(identifier, plainCode);

      expect(otpModel.findOne).toHaveBeenCalledWith({ identifier });
      expect(spyBcryptCompare).toHaveBeenCalledWith(plainCode, fakeHash);
      expect(otpModel.deleteOne).toHaveBeenCalledWith({ identifier });
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if OTP doc not found', async () => {
      otpModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });

      await expect(serviceWithPasswordless.verifyOtpCode(identifier, plainCode))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      otpModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ identifier, hashedCode: fakeHash, expiresAt: pastDate }),
      });

      await expect(serviceWithPasswordless.verifyOtpCode(identifier, plainCode))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if code is wrong', async () => {
      otpModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ identifier, hashedCode: fakeHash, expiresAt: futureDate }),
      });
      spyBcryptCompare.mockResolvedValue(false);

      await expect(serviceWithPasswordless.verifyOtpCode(identifier, plainCode))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      otpModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ identifier, hashedCode: fakeHash, expiresAt: futureDate }),
      });
      spyBcryptCompare.mockResolvedValue(true);
      exec.mockResolvedValue(null);

      await expect(serviceWithPasswordless.verifyOtpCode(identifier, plainCode))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should call passwordlessOptions.callback if provided after verification', async () => {
      const verifyCallback = vi.fn().mockResolvedValue(undefined);
      serviceWithPasswordless['passwordlessOptions'].callback = verifyCallback;

      otpModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ identifier, hashedCode: fakeHash, expiresAt: futureDate }),
      });
      spyBcryptCompare.mockResolvedValue(true);
      exec.mockResolvedValue({ ...fakeUser, login: identifier, _id: fakeUserId });
      otpModel.deleteOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      vi.spyOn(DynamicApiModule.state, 'get').mockReturnValue(undefined);

      await serviceWithPasswordless.verifyOtpCode(identifier, plainCode);

      expect(verifyCallback).toHaveBeenCalled();
    });
  });
});
