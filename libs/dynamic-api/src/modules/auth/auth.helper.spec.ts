import { describe } from 'node:test';
import { BaseEntity } from '../../models';
import {
  authServiceProviderName,
  createAuthController,
  createAuthServiceProvider,
  createLocalStrategyProvider,
  localStrategyProviderName,
} from './auth.helper';
import { DynamicApiRegisterOptions } from './interfaces';

describe('AuthHelper', () => {
  class UserEntity extends BaseEntity {
    login: string;

    pass: string;

    nickname: string;
  }

  const loginField = 'login';
  const passwordField = 'pass';
  const additionalRequestFields: (keyof UserEntity)[] = ['nickname'];
  const registerOptions: DynamicApiRegisterOptions<UserEntity> = {
    additionalFields: ['nickname'],
    protected: false,
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
        createAuthServiceProvider(UserEntity, loginField, passwordField, additionalRequestFields, undefined, undefined, undefined),
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
        additionalRequestFields,
        registerOptions,
        undefined,
        undefined,
      );

      expect(controller).toEqual(expect.any(Function));
      expect(controller.name).toBe('AuthController');
    });
  });
});
