import { Type, ValidationPipeOptions } from '@nestjs/common';
import {
  DynamicApiResetPasswordCallback,
  DynamicApiServiceCallback,
  RegisterAbilityPredicate,
} from '../../../interfaces';
import { BaseEntity } from '../../../models';

type DynamicApiJWTOptions = {
  secret: string;
  expiresIn?: string | number;
};

type DynamicApiLoginOptions<Entity extends BaseEntity = any> = {
  callback?: DynamicApiServiceCallback<Entity>;
}

type DynamicApiRegisterOptions<Entity extends BaseEntity = any> = {
  callback?: DynamicApiServiceCallback<Entity>;
  protected?: boolean;
  abilityPredicate?: RegisterAbilityPredicate;
  additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
};

type DynamicApiUserOptions<Entity extends BaseEntity = any> = {
  entity: Type<Entity>;
  loginField?: keyof Entity;
  passwordField?: keyof Entity;
  requestAdditionalFields?: (keyof Entity)[];
};

type DynamicApiResetPasswordOptions<Entity extends BaseEntity = any> = {
  resetPasswordCallback: DynamicApiResetPasswordCallback<Entity>;
  changePasswordCallback: DynamicApiServiceCallback<Entity>;
  emailField: keyof Entity | string;
  expiresInMinutes: number;
};

type DynamicApiAuthOptions<Entity extends BaseEntity = any> = {
  user: DynamicApiUserOptions<Entity>;
  login?: DynamicApiLoginOptions<Entity>;
  register?: DynamicApiRegisterOptions<Entity>;
  jwt?: DynamicApiJWTOptions;
  resetPassword?: Partial<DynamicApiResetPasswordOptions<Entity>>;
  validationPipeOptions?: ValidationPipeOptions;
};

export type {
  DynamicApiAuthOptions,
  DynamicApiRegisterOptions,
  DynamicApiUserOptions,
  DynamicApiJWTOptions,
  DynamicApiLoginOptions,
  DynamicApiResetPasswordOptions,
};
