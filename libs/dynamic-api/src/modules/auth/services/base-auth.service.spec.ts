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
  let spyBcriptHashPassword: jest.SpyInstance;
  let spyJwtSign: jest.SpyInstance;
  let spyBuildUserFields: jest.SpyInstance;
  let spyFindOneDocumentWithAbilityPredicate: jest.SpyInstance;
  let exec: jest.Mock;

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
  const fakeBeforeRegisterCallback = jest.fn();
  const fakeRegisterCallback = jest.fn();
  const fakeLoginCallback = jest.fn();
  const fakeGetAccountCallback = jest.fn();
  const resetPasswordCallback = jest.fn();
  const beforeChangePasswordCallback = jest.fn();
  const changePasswordCallback = jest.fn();
  const fakeBeforeUpdateAccountCallback = jest.fn();
  const updateAccountCallback = jest.fn();

  class AuthService extends BaseAuthService<User> {
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
    ) {
      super(_, jwtService, bcryptService);
    }
  }


  beforeEach(async () => {
    fakeGetAccountCallback.mockClear();
    exec = jest.fn();
    const lean = jest.fn(() => ({ exec }));
    model = {
      create: jest.fn(),
      find: jest.fn(() => ({ lean })),
      findOne: jest.fn(() => ({ lean })),
      findOneAndUpdate: jest.fn(() => ({ lean })),
      updateOne: jest.fn(() => ({ exec })),
      updateMany: jest.fn(() => ({ exec })),
      deleteOne: jest.fn(() => ({ exec })),
      deleteMany: jest.fn(() => ({ exec })),
      schema: {
        paths: {},
      } as Schema<any>
    };

    jwtService = {
      decode: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as JwtService;
    bcryptService = {
      comparePassword: jest.fn(),
      hashPassword: jest.fn(),
    } as unknown as BcryptService;
    service = new AuthService(model, jwtService, bcryptService);

    spyBcriptHashPassword = jest.spyOn(bcryptService, 'hashPassword').mockResolvedValue(fakeHash);
    spyJwtSign = jest.spyOn(jwtService, 'sign');
    spyBuildUserFields = jest.spyOn<any, any>(service, 'buildUserFields');
    spyFindOneDocumentWithAbilityPredicate =
      jest.spyOn<any, any>(service, 'findOneDocumentWithAbilityPredicate');
    jest.spyOn(DynamicApiGlobalStateService, 'getEntityModel').mockResolvedValue(model);
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
    let spyDynamicApiModuleStateGet: jest.SpyInstance;
    let spyBcryptCompare: jest.SpyInstance;

    const refreshToken = 'fake-refresh-token';
    const fakeHash = 'fake-hashed-refresh';

    beforeEach(() => {
      spyJwtSign.mockReturnValue(accessToken);
      spyBuildUserFields.mockReturnValue(fakeLoginBuilt);
      spyDynamicApiModuleStateGet = jest.spyOn(DynamicApiModule.state, 'get');
      spyBcryptCompare = jest.spyOn(bcryptService, 'comparePassword');
    });

    afterEach(() => {
      jest.restoreAllMocks();
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
        jest.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'some-jti' });
        spyBcryptCompare.mockResolvedValueOnce(false);

        await expect(service['refreshToken'](fakeUser, 'wrong-token')).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });

      it('should rotate refresh token and update hash in DB on valid token', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash });
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('new-hashed-refresh');
        jest.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })  // decode rawToken for validation
          .mockReturnValueOnce({ jti: 'new-jti' });    // decode new refreshToken for storage

        const result = await service['refreshToken'](fakeUser, 'valid-token');

        expect(spyBcryptCompare).toHaveBeenCalledWith('input-jti', fakeHash);
        expect(spyBcriptHashPassword).toHaveBeenCalledWith('new-jti');
        expect(model.updateOne).toHaveBeenCalledWith(
          { _id: fakeUser._id },
          { $set: { nickname: 'new-hashed-refresh' } },
        );
        expect(result).toEqual({ accessToken, refreshToken });
      });

      it('should use user.id fallback when user._id is absent and update DB', async () => {
        const userWithoutId = { ...fakeUser, _id: undefined as unknown as ObjectId, id: 'only-id' };
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash });
        spyBcryptCompare.mockResolvedValueOnce(true);
        spyBcriptHashPassword.mockResolvedValueOnce('new-hashed-refresh');
        jest.spyOn(jwtService, 'decode')
          .mockReturnValueOnce({ jti: 'input-jti' })
          .mockReturnValueOnce({ jti: 'new-jti' });

        await service['refreshToken'](userWithoutId as unknown as User, 'valid-token');

        expect(model.updateOne).toHaveBeenCalledWith(
          { _id: 'only-id' },
          { $set: { nickname: 'new-hashed-refresh' } },
        );
      });

      it('should handle rawToken without jti (decode returns object without jti)', async () => {
        exec.mockResolvedValueOnce({ ...fakeUser, nickname: fakeHash });
        jest.spyOn(jwtService, 'decode').mockReturnValueOnce({});

        await expect(service['refreshToken'](fakeUser, 'token-without-jti')).rejects.toThrow(
          new UnauthorizedException('Invalid refresh token'),
        );
      });
    });
  });

  describe('logout', () => {
    let spyLoggerWarn: jest.SpyInstance;

    beforeEach(() => {
      spyLoggerWarn = jest.spyOn<any, any>(service['logger'], 'warn').mockImplementation(jest.fn());
    });

    afterEach(() => {
      jest.restoreAllMocks();
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
    let spyBcryptCompare: jest.SpyInstance;

    beforeEach(() => {
      spyBcryptCompare = jest.spyOn(bcryptService, 'comparePassword');
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
      jest.spyOn(DynamicApiModule.state, 'get').mockReturnValue(undefined);
    });

    it('should return { accessToken, refreshToken } and call loginCallback if defined and login is not call from member', async () => {
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'fake-jti' });
      service['refreshTokenField'] = 'nickname' as keyof User;
      spyBcriptHashPassword.mockResolvedValueOnce('hashed-refresh');

      await service['login'](fakeUser);

      expect(spyBcriptHashPassword).toHaveBeenCalledWith('fake-jti');
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: fakeUser._id },
        { $set: { nickname: 'hashed-refresh' } },
      );
      service['refreshTokenField'] = undefined;
    });

    it('should not store refresh token when refreshTokenField is not configured', async () => {
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      service['refreshTokenField'] = undefined;

      await service['login'](fakeUser);

      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('should store hashed refresh token using user.id when user._id is absent', async () => {
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce({ jti: 'fake-jti' });
      service['refreshTokenField'] = 'nickname' as keyof User;
      spyBcriptHashPassword.mockResolvedValueOnce('hashed-refresh');
      const userWithoutId = { ...fakeUser, _id: undefined as unknown as ObjectId, id: 'only-id' };

      await service['login'](userWithoutId as unknown as User);

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: 'only-id' },
        { $set: { nickname: 'hashed-refresh' } },
      );
      service['refreshTokenField'] = undefined;
    });
  });

  describe('register', () => {
    let spyLogin: jest.SpyInstance;
    let spyHandleDuplicateKeyError: jest.SpyInstance;
    let spyCheckFieldsValidity: jest.SpyInstance;

    const userToCreate = {
      login: fakeLogin,
      pass: fakePass,
    };

    beforeEach(() => {
      spyCheckFieldsValidity = jest.spyOn<any, any>(service, 'checkFieldsValidity');
      spyLogin = jest.spyOn<any, any>(service, 'login').mockReturnValueOnce({ accessToken, refreshToken: 'fake-refresh' });
      exec.mockResolvedValueOnce(fakeUser);
      spyHandleDuplicateKeyError = jest.spyOn<any, any>(service, 'handleDuplicateKeyError');
    });

    it('should return token and call registerCallback if it is defined', async () => {
      service['beforeRegisterCallback'] = undefined;
      model.create.mockResolvedValueOnce(fakeUser);
      exec.mockResolvedValueOnce(fakeUser);
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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
      jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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

    it('should throw a bad request exception if user already exists', async () => {
      const fakeDuplicateKeyError = { code: 11000, keyValue: { login: 'test' } };
      model.create.mockRejectedValueOnce(fakeDuplicateKeyError);

      await expect(() => service['register'](userToCreate))
      .rejects
      .toThrow(new BadRequestException('login \'test\' is already used'));
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
      const spyBuildInstance = jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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
    let spyBuildInstance: jest.SpyInstance;
    let spyGetAccount: jest.SpyInstance;

    const fakeUserId = 'fake-id';
    const update = { nickname: 'new-nickname' };

    beforeEach(() => {
      spyGetAccount = jest.spyOn<any, any>(service, 'getAccount').mockResolvedValueOnce(fakeUser);
      spyBuildInstance = jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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
        jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
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
    let spyJwtDecode: jest.SpyInstance;
    let spyDateNow: jest.SpyInstance;
    let spyMathRound: jest.SpyInstance;
    let spyLoggerWarn: jest.SpyInstance;

    const fakeDecodedToken = { email: fakeUser.login, exp: 1000 };

    beforeEach(() => {
      spyJwtDecode = jest.spyOn(jwtService, 'decode');
      spyDateNow = jest.spyOn(Date, 'now');
      spyMathRound = jest.spyOn(Math, 'round');
      spyLoggerWarn = jest.spyOn<any, any>(service['logger'], 'warn').mockImplementation(jest.fn());
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
      jest.spyOn(bcryptService, 'hashPassword').mockResolvedValueOnce(hashedPassword);

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
      .toThrow(new BadRequestException([`${fakeLoginField} is required`]));
    });

    it('should throw bad request if user to create does not have password field', () => {
      const userToCreate = { login: fakeLogin };

      expect(() => service['checkFieldsValidity'](userToCreate))
      .toThrow(new BadRequestException([`${fakePasswordField} is required`]));
    });

    it('should throw bad request if user to create has no fields', () => {
      expect(() => service['checkFieldsValidity']({})).toThrow(
        new BadRequestException([`${fakeLoginField} is required`, `${fakePasswordField} is required`]),
      );
    });
  });
});
