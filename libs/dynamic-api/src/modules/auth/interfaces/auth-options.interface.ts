import { Type, ValidationPipeOptions } from '@nestjs/common';
import {
  DynamicApiResetPasswordCallback,
  DynamicApiServiceCallback,
  AuthAbilityPredicate,
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

type DynamicApiResetPasswordOptions<Entity extends BaseEntity = any> = {
  emailField: keyof Entity | string;
  expirationInMinutes: number;
  resetPasswordCallback: DynamicApiResetPasswordCallback<Entity>;
  changePasswordCallback: DynamicApiServiceCallback<Entity>;
  changePasswordAbilityPredicate?: AuthAbilityPredicate;
};

type DynamicApiAuthOptions<Entity extends BaseEntity = any> = {
  userEntity: Type<Entity>;
  login?: DynamicApiLoginOptions<Entity>;
  register?: DynamicApiRegisterOptions<Entity>;
  jwt?: DynamicApiJWTOptions;
  resetPassword?: Partial<DynamicApiResetPasswordOptions<Entity>>;
  validationPipeOptions?: ValidationPipeOptions;
};

export type {
  DynamicApiAuthOptions,
  DynamicApiRegisterOptions,
  DynamicApiJWTOptions,
  DynamicApiLoginOptions,
  DynamicApiResetPasswordOptions,
};
