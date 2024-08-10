import { Type, ValidationPipeOptions } from '@nestjs/common';
import {
  AuthAbilityPredicate,
  DynamicApiResetPasswordCallback,
  DynamicApiServiceCallback,
  DynamicApiWebSocketOptions,
} from '../../../interfaces';
import { BaseEntity } from '../../../models';

type DynamicApiJWTOptions = {
  secret: string;
  expiresIn?: string | number;
};

type DynamicApiLoginOptions<Entity extends BaseEntity = any> = {
  loginField?: keyof Entity;
  passwordField?: keyof Entity;
  callback?: DynamicApiServiceCallback<Entity>;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFields?: (keyof Entity)[];
}

type DynamicApiRegisterOptions<Entity extends BaseEntity = any> = {
  callback?: DynamicApiServiceCallback<Entity>;
  protected?: boolean;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
};

type DynamicApiUpdateAccountOptions<Entity extends BaseEntity = any> = {
  callback?: DynamicApiServiceCallback<Entity>;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFieldsToExclude?: (keyof Entity)[];
};

type DynamicApiResetPasswordOptions<Entity extends BaseEntity = any> = {
  emailField?: keyof Entity | string;
  expirationInMinutes?: number;
  resetPasswordCallback?: DynamicApiResetPasswordCallback<Entity>;
  changePasswordCallback?: DynamicApiServiceCallback<Entity>;
  changePasswordAbilityPredicate?: AuthAbilityPredicate;
};

type DynamicApiAuthOptions<Entity extends BaseEntity = any> = {
  userEntity: Type<Entity>;
  jwt?: DynamicApiJWTOptions;
  login?: DynamicApiLoginOptions<Entity>;
  register?: DynamicApiRegisterOptions<Entity>;
  updateAccount?: DynamicApiUpdateAccountOptions<Entity>;
  resetPassword?: Partial<DynamicApiResetPasswordOptions<Entity>>;
  validationPipeOptions?: ValidationPipeOptions;
  webSocket?: DynamicApiWebSocketOptions;
};

export type {
  DynamicApiAuthOptions,
  DynamicApiRegisterOptions,
  DynamicApiUpdateAccountOptions,
  DynamicApiJWTOptions,
  DynamicApiLoginOptions,
  DynamicApiResetPasswordOptions,
};
