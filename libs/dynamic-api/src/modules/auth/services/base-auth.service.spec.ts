import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../../__mocks__/model.mock';
import { BaseEntity } from '../../../models';
import { BcryptService } from '../../../services';
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
  const accessToken = 'fake-token';

  beforeEach(async () => {
    model = buildModelMock();
    jwtService = {
      sign: jest.fn(),
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
});
