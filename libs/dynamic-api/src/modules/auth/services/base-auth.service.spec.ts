import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../../__mocks__/model.mock';
import { BaseEntity } from '../../../models';
import { BcryptService } from '../../../services';
import { DynamicApiResetPasswordOptions } from '../interfaces';
import { BaseAuthService } from './base-auth.service';

describe('BaseAuthService', () => {
  class User extends BaseEntity {
    login: string;

    pass: string;

    nickname: string;
  }

  class AuthService extends BaseAuthService<User> {
    entity = User;

    loginField = 'login' as keyof User;

    passwordField = 'pass' as keyof User;

    constructor(
      protected readonly _: Model<any>,
      protected readonly jwtService: JwtService,
      protected readonly bcryptService: BcryptService,
    ) {
      super(_, jwtService, bcryptService);
    }
  }

  let service: AuthService;
  let model: Model<User>;
  let jwtService: JwtService;
  let bcryptService: BcryptService;

  const fakeDate = new Date();

  const fakeHash = 'fake-hash';
  const fakeUser = {
    _id: 'fake-id' as any,
    id: 'undefined',
    login: 'test',
    pass: fakeHash,
    nickname: 'test',
    __v: 0,
    createdAt: fakeDate,
    updatedAt: fakeDate,
  } as User;
  const fakeUserBuilt = {
    id: 'fake-id',
    login: 'test',
    pass: fakeHash,
    nickname: 'test',
    createdAt: fakeDate,
    updatedAt: fakeDate,
  } as User;
  const accessToken = 'fake-token';

  beforeEach(async () => {
    model = buildModelMock();
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
  });

  describe('methods', () => {
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
    it('should return null if user is not found', async () => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as unknown as any);

      const result = await service['validateUser']('login', 'pass');
      expect(result).toBeNull();
    });

    it('should return null if password is not valid', async () => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ pass: '****' }),
        }),
      } as unknown as any);
      jest.spyOn(bcryptService, 'comparePassword').mockResolvedValue(false);

      const result = await service['validateUser']('login', 'pass');
      expect(result).toBeNull();
    });

    it('should return user if password is valid', async () => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(fakeUser),
        }),
      } as unknown as any);
      jest.spyOn(bcryptService, 'comparePassword').mockResolvedValue(true);

      const result = await service['validateUser']('login', 'pass');
      expect(result).toEqual({ id: fakeUser._id, login: fakeUser.login });
    });

    it('should return user with additional fields if password is valid', async () => {
      service['additionalRequestFields'] = ['nickname' as keyof User];
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(fakeUser),
        }),
      } as unknown as any);
      jest.spyOn(bcryptService, 'comparePassword').mockResolvedValue(true);

      const result = await service['validateUser']('login', 'pass');
      expect(result).toEqual({ id: fakeUser._id, login: fakeUser.login, nickname: fakeUser.nickname });
    });
  });

  describe('login', () => {
    it('should return token', async () => {
      jest.spyOn(jwtService, 'sign').mockReturnValue(accessToken);

      const result = await service['login'](fakeUser);
      expect(result).toEqual({ accessToken });
    });

    it('should call loginCallback if it is defined', async () => {
      service['loginCallback'] = jest.fn();
      jest.spyOn(jwtService, 'sign').mockReturnValue(accessToken);

      await service['login'](fakeUser);
      expect(service['loginCallback']).toHaveBeenCalledWith({ id: fakeUser._id, login: fakeUser.login }, model);
    });
  });

  describe('register', () => {
    it('should return token', async () => {
      const { _id, id, __v, createdAt, updatedAt, ...userToCreate } = fakeUser;
      jest.spyOn(bcryptService, 'hashPassword').mockResolvedValue(fakeHash);
      jest.spyOn(jwtService, 'sign').mockReturnValue(accessToken);
      const modelCreateSpy = jest.spyOn(model, 'create').mockResolvedValue(fakeUser as any);
      const modelFindOneSpy = jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(fakeUser),
        }),
      } as unknown as any);
      const result = await service['register'](userToCreate);

      expect(result).toEqual({ accessToken });
      expect(bcryptService.hashPassword).toHaveBeenCalledWith(userToCreate.pass);
      expect(modelCreateSpy).toHaveBeenCalledWith({ ...userToCreate, pass: fakeHash });
      expect(modelFindOneSpy).toHaveBeenCalledWith({ _id: fakeUser._id });
    });

    it('should call registerCallback if it is defined', async () => {
      service['registerCallback'] = jest.fn();
      const { _id, id, __v, createdAt, updatedAt, ...userToCreate } = fakeUser;
      jest.spyOn(bcryptService, 'hashPassword').mockResolvedValue(fakeHash);
      jest.spyOn(jwtService, 'sign').mockReturnValue(accessToken);
      jest.spyOn(model, 'create').mockResolvedValue(fakeUser as any);
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(fakeUser),
        }),
      } as unknown as any);

      await service['register'](userToCreate);
      expect(service['registerCallback']).toHaveBeenCalledWith(fakeUser, model);
    });
  });

  describe('getAccount', () => {
    beforeEach(() => {
      jest.spyOn(model, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(fakeUser),
        }),
      } as unknown as any);
    });

    it('should return user with only login and additional fields', async () => {
      const result = await service['getAccount']({ id: fakeUser.id } as User);

      expect(result).toEqual({ id: fakeUser._id, login: fakeUser.login });
    });

    it('should return user with only login and additional fields', async () => {
      service['additionalRequestFields'] = ['nickname' as keyof User];
      const result = await service['getAccount']({ id: fakeUser.id } as User);

      expect(result).toEqual({ id: fakeUser._id, login: fakeUser.login, nickname: fakeUser.nickname });
    });
  });

  describe('resetPassword', () => {
    const fakeEmail = 'fake-email';

    it('should not generate token if resetPasswordOptions is not defined', async () => {
      await service['resetPassword'](fakeEmail);

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should generate token if resetPasswordOptions is defined', async () => {
      const resetPasswordCallback = jest.fn();
      const changePasswordCallback = jest.fn();
      const options = {
        resetPasswordCallback,
        changePasswordCallback,
        emailField: 'email',
        expiresInMinutes: 5,
      } as DynamicApiResetPasswordOptions<User>;
      service['resetPasswordOptions'] = options;
      (
        jwtService.sign as jest.Mock
      ).mockReturnValue('fake-token');
      await service['resetPassword'](fakeEmail);

      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign)
      .toHaveBeenCalledWith({ email: fakeEmail }, { expiresIn: options.expiresInMinutes * 60 });
      expect(resetPasswordCallback).toHaveBeenCalledTimes(1);
      expect(resetPasswordCallback)
      .toHaveBeenCalledWith(
        { resetPasswordToken: expect.any(String), email: fakeEmail },
        service['resetPasswordCallbackMethods'],
      );
      expect(changePasswordCallback).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const resetPasswordCallback = jest.fn();
    const changePasswordCallback = jest.fn();
    const resetPasswordToken = 'reset-pass-token';
    const newPassword = 'new-pass';
    const hashedPassword = 'hashed-pass';

    beforeEach(() => {
      service['resetPasswordOptions'] = {
        resetPasswordCallback,
        changePasswordCallback,
        emailField: 'email',
        expiresInMinutes: 5,
      } as DynamicApiResetPasswordOptions<User>;
    });

    it('should throw bad request if token is invalid', async () => {
      await expect(service['changePassword'](resetPasswordToken, newPassword)).rejects.toThrow(
        new BadRequestException('Invalid reset password token. Please redo the reset password process.'),
      );
    });

    it('should throw unauthorized if token is expired', async () => {
      jwtService.decode = jest.fn().mockReturnValue({ email: fakeUser.login, exp: 1000 });
      jest.spyOn(Math, 'round').mockReturnValue(2000);

      await expect(service['changePassword'](resetPasswordToken, newPassword)).rejects.toThrow(
        new UnauthorizedException('Time to reset password has expired. Please redo the reset password process.'),
      );
    });

    it('should not change password if user is not found', async () => {
      jwtService.decode = jest.fn().mockReturnValue({ email: fakeUser.login, exp: 1000 });
      jest.spyOn(Math, 'round').mockReturnValue(500);
      jest.spyOn(service, 'findOneDocument').mockResolvedValue(undefined);

      await service['changePassword'](resetPasswordToken, newPassword);

      expect(bcryptService.hashPassword).not.toHaveBeenCalled();
      expect(model.updateOne).not.toHaveBeenCalled();
      expect(changePasswordCallback).not.toHaveBeenCalled();
      expect(resetPasswordCallback).not.toHaveBeenCalled();
    });

    it('should change password', async () => {
      jest.spyOn(bcryptService, 'hashPassword').mockResolvedValue(hashedPassword);
      const modelUpdateSpy = jest.spyOn(model, 'updateOne').mockResolvedValue({} as any);
      jwtService.decode = jest.fn().mockReturnValue({ email: fakeUser.login, exp: 1000 });
      jest.spyOn(Math, 'round').mockReturnValue(500);
      jest.spyOn(service, 'findOneDocument').mockResolvedValue(fakeUser);

      await service['changePassword'](resetPasswordToken, newPassword);
      expect(bcryptService.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(modelUpdateSpy).toHaveBeenCalledWith({ _id: fakeUser._id }, { pass: hashedPassword });
      expect(changePasswordCallback).toHaveBeenCalledTimes(1);
      expect(changePasswordCallback).toHaveBeenCalledWith(fakeUserBuilt, service['callbackMethods']);
      expect(resetPasswordCallback).not.toHaveBeenCalled();
    });
  });
});
