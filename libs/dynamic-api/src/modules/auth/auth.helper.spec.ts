import { describe } from 'node:test';
import { BaseEntity } from '../../models';
import {
  authServiceProviderName,
  createAuthController,
  createAuthServiceProvider,
  createLocalStrategyProvider,
  localStrategyProviderName,
} from './auth.helper';
import { AuthAdditionalFields } from './interfaces';

describe('AuthHelper', () => {
  class UserEntity extends BaseEntity {
    login: string;

    pass: string;

    nickname: string;
  }

  const loginField = 'login';
  const passwordField = 'pass';
  const additionalFields: AuthAdditionalFields<UserEntity> = {
    toRegister: ['nickname'],
    toRequest: ['nickname'],
  };

  describe('createLocalStrategyProvider', () => {
    it('should return a provider', () => {
      expect(createLocalStrategyProvider<UserEntity>('login', 'pass')).toEqual({
        provide: localStrategyProviderName,
        useClass: expect.any(Function),
      });
    });
  });

  describe('createAuthServiceProvider', () => {
    it('should return a provider', () => {
      expect(
        createAuthServiceProvider(UserEntity, loginField, passwordField, additionalFields),
      ).toEqual({
        provide: authServiceProviderName,
        useClass: expect.any(Function),
      });
    });
  });

  describe('createAuthController', () => {
    it('should return a controller', () => {
      const controller = createAuthController(
        UserEntity,
        loginField,
        passwordField,
        additionalFields,
        false,
      );

      expect(controller).toEqual(expect.any(Function));
      expect(controller.name).toBe('AuthController');
    });
  });
});
