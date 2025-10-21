import { Type } from '@nestjs/common';
import { BaseEntity } from '../src';
import { DynamicApiAuthOptions } from '../src/modules';

export const getFullAuthOptionsMock = <Entity extends BaseEntity>(
  userEntity: Type<Entity>,
  loginField: keyof Entity,
  passwordField: keyof Entity,
  loginAdditionalFields: (keyof Entity)[] = [],
  registerAdditionalFields: (keyof Entity | { name: keyof Entity; required?: boolean })[] = [],
  updateAccountAdditionalFieldsToExclude: (keyof Entity)[] = [],
): DynamicApiAuthOptions<Entity> => ({
  userEntity,
  jwt: { secret: 'secret', expiresIn: '1h' },
  login: {
    loginField,
    passwordField,
    additionalFields: [...loginAdditionalFields],
    abilityPredicate: jest.fn(),
    callback: jest.fn(),
    useInterceptors: [],
  },
  register: {
    additionalFields: [...registerAdditionalFields],
    protected: false,
    abilityPredicate: jest.fn(),
    beforeSaveCallback: jest.fn(),
    callback: jest.fn(),
    useInterceptors: [],
  },
  updateAccount: {
    abilityPredicate: jest.fn(),
    callback: jest.fn(),
    beforeSaveCallback: jest.fn(),
    additionalFieldsToExclude: [...updateAccountAdditionalFieldsToExclude],
    useInterceptors: [],
  },
  resetPassword: {
    beforeChangePasswordCallback: jest.fn(),
    resetPasswordCallback: jest.fn(),
    resetPasswordUseInterceptors: [],
    changePasswordCallback: jest.fn(),
    changePasswordUseInterceptors: [],
    emailField: 'email',
    expirationInMinutes: 30,
    changePasswordAbilityPredicate: jest.fn(),
  },
  validationPipeOptions: { whitelist: true },
  webSocket: { namespace: 'namespace' },
});
