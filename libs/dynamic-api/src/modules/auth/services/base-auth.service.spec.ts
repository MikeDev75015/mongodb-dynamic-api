import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { Model, Schema } from 'mongoose';
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
    _id: fakeUserId as any,
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
  const fakeRegisterCallback = jest.fn();
  const fakeLoginCallback = jest.fn();
  const resetPasswordCallback = jest.fn();
  const changePasswordCallback = jest.fn();

  class AuthService extends BaseAuthService<User> {
    protected additionalRequestFields: (keyof User)[] = ['nickname'];

    protected loginCallback = fakeLoginCallback;

    protected loginField = fakeLoginField;

    protected passwordField = fakePasswordField;

    protected registerCallback = fakeRegisterCallback;

    protected resetPasswordOptions = {
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
      spyBuildUserFields.mockReturnValueOnce(fakeLoginBuilt);
      const result = await service['validateUser'](fakeLogin, fakePass);

      expect(spyBuildUserFields)
      .toHaveBeenCalledWith(fakeUser, ['_id', fakeLoginField, ...service['additionalRequestFields']]);
      expect(result).toEqual(fakeLoginBuilt);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      spyJwtSign.mockReturnValueOnce(accessToken);
      spyBuildUserFields.mockReturnValueOnce(fakeLoginBuilt);
    });

    it('should return token and call loginCallback if defined and login is not call from member', async () => {
      const result = await service['login'](fakeUser);

      expect(spyBuildUserFields)
      .toHaveBeenCalledWith(fakeUser, ['_id', 'id', fakeLoginField, ...service['additionalRequestFields']]);
      expect(fakeLoginCallback).toHaveBeenCalledTimes(1);
      expect(fakeLoginCallback).toHaveBeenCalledWith(
        { id: fakeUser._id, login: fakeUser.login, nickname: fakeUser.nickname },
        service['callbackMethods'],
      );
      expect(spyJwtSign).toHaveBeenCalledWith(fakeLoginBuilt);
      expect(result).toEqual({ accessToken });
    });

    it('should return token and not call loginCallback if defined but login is call from member', async () => {
      await service['login'](fakeUser, true);

      expect(service['loginCallback']).not.toHaveBeenCalled();
    });

    it('should return token and not call loginCallback if not defined', async () => {
      service['loginCallback'] = undefined;
      await service['login'](fakeUser);

      expect(fakeLoginCallback).not.toHaveBeenCalled();
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
      spyLogin = jest.spyOn<any, any>(service, 'login').mockReturnValueOnce({ accessToken });
      exec.mockResolvedValueOnce(fakeUser);
      spyHandleDuplicateKeyError = jest.spyOn<any, any>(service, 'handleDuplicateKeyError');
    });

    it('should return token and call registerCallback if it is defined', async () => {
      model.create.mockResolvedValueOnce(fakeUser);
      const result = await service['register'](userToCreate);

      expect(spyCheckFieldsValidity).toHaveBeenCalledWith(userToCreate);
      expect(spyBcriptHashPassword).toHaveBeenCalledWith(userToCreate.pass);
      expect(model.create).toHaveBeenCalledWith({ ...userToCreate, pass: fakeHash });
      expect(model.findOne).toHaveBeenCalledWith({ _id: fakeUser._id });
      expect(fakeRegisterCallback).toHaveBeenCalledTimes(1);
      expect(fakeRegisterCallback).toHaveBeenCalledWith(fakeUser, service['callbackMethods']);
      expect(spyLogin).toHaveBeenCalledWith(fakeUser, true);
      expect(result).toEqual({ accessToken });
    });

    it('should return token and not call registerCallback if it is not defined', async () => {
      service['registerCallback'] = undefined;
      model.create.mockResolvedValueOnce(fakeUser);
      await service['register'](userToCreate);

      expect(fakeRegisterCallback).not.toHaveBeenCalled();
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
    beforeEach(() => {
      exec.mockResolvedValueOnce(fakeUser);
      spyBuildUserFields.mockReturnValueOnce(fakeLoginBuilt);
    });

    it('should return user with only login and additional fields', async () => {
      const result = await service['getAccount']({ id: fakeUser.id } as User);

      expect(model.findOne).toHaveBeenCalledWith({ _id: fakeUser.id });
      expect(spyBuildUserFields).toHaveBeenCalledWith(fakeUser, ['_id', fakeLoginField, ...service['additionalRequestFields']]);
      expect(result).toEqual(fakeLoginBuilt);
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
        const result = await service['resetPasswordCallbackMethods'].findUserByEmail(fakeEmail);

        expect(model.findOne).toHaveBeenCalledWith({ [fakeEmailField]: fakeEmail });
        expect(result).toEqual(fakeUserInstance);
      });

      it('should be undefined if user is not found', async () => {
        exec.mockResolvedValueOnce(null);
        const result = await service['resetPasswordCallbackMethods'].findUserByEmail(fakeEmail);

        expect(model.findOne).toHaveBeenCalledTimes(1);
        expect(model.findOne).toHaveBeenCalledWith({ [fakeEmailField]: fakeEmail });
        expect(result).toBeUndefined();
      });

      it('should update user by email', async () => {
        exec.mockResolvedValueOnce(fakeUser);
        const result = await service['resetPasswordCallbackMethods'].updateUserByEmail(fakeEmail, { pass: fakeHash });

        expect(model.findOneAndUpdate).toHaveBeenCalledWith(
          { [fakeEmailField]: fakeEmail },
          { pass: fakeHash },
          { new: true },
        );
        expect(result).toEqual(fakeUserInstance);
      });

      it('should not update user if user is not found', async () => {
        exec.mockResolvedValueOnce(null);
        const result = await service['resetPasswordCallbackMethods'].updateUserByEmail(fakeEmail, { pass: fakeHash });

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

    it('should not change password if user is not found', async () => {
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(undefined);

      await service['changePassword'](resetPasswordToken, newPassword);

      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledWith(undefined, { [fakeEmailField]: fakeUser.login });
      expect(spyLoggerWarn).toHaveBeenCalledTimes(1);
      expect(spyLoggerWarn).toHaveBeenCalledWith('Invalid email, user not found');
      expect(spyBcriptHashPassword).not.toHaveBeenCalled();
    });

    it('should change password and call changePasswordCallback if defined', async () => {
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(fakeUser).mockResolvedValueOnce(fakeUser);
      spyBcriptHashPassword.mockResolvedValueOnce(hashedPassword);
      const spyBuildInstance = jest.spyOn<any, any>(service, 'buildInstance').mockReturnValueOnce(fakeUserInstance);
      jest.spyOn(bcryptService, 'hashPassword').mockResolvedValueOnce(hashedPassword);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenCalledTimes(2);
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenNthCalledWith(1,undefined, { [fakeEmailField]: fakeUser.login });
      expect(spyFindOneDocumentWithAbilityPredicate).toHaveBeenNthCalledWith(2, fakeUser._id);
      expect(spyBcriptHashPassword).toHaveBeenCalledWith(newPassword);
      expect(model.updateOne).toHaveBeenCalledWith({ _id: fakeUser._id }, { [fakePasswordField]: hashedPassword });
      expect(spyBuildInstance).toHaveBeenCalledWith(fakeUser);
      expect(changePasswordCallback).toHaveBeenCalledTimes(1);
      expect(changePasswordCallback).toHaveBeenCalledWith(fakeUserInstance, service['callbackMethods']);
    });

    it('should change password and not call changePasswordCallback if not defined', async () => {
      service['resetPasswordOptions'].changePasswordCallback = undefined;
      spyJwtDecode.mockReturnValueOnce(fakeDecodedToken);
      const fakeTimestamp = 500000;
      spyDateNow.mockReturnValueOnce(fakeTimestamp);
      spyFindOneDocumentWithAbilityPredicate.mockResolvedValueOnce(fakeUser);
      spyBcriptHashPassword.mockResolvedValueOnce(hashedPassword);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(changePasswordCallback).not.toHaveBeenCalled();
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
