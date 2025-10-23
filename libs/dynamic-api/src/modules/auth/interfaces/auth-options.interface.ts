import { ModuleMetadata, NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import {
  AuthAbilityPredicate,
  DynamicApiResetPasswordCallback, DynamicApiServiceBeforeSaveCallback,
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
  useInterceptors?: Type<NestInterceptor>[];
}

type DynamicApiRegisterOptions<Entity extends BaseEntity = any> = {
  beforeSaveCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  protected?: boolean;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
  useInterceptors?: Type<NestInterceptor>[];
};

type DynamicApiUpdateAccountOptions<Entity extends BaseEntity = any> = {
  beforeSaveCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFieldsToExclude?: (keyof Entity)[];
  useInterceptors?: Type<NestInterceptor>[];
};

type DynamicApiResetPasswordOptions<Entity extends BaseEntity = any> = {
  emailField?: keyof Entity | string;
  expirationInMinutes?: number;
  beforeChangePasswordCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  resetPasswordCallback?: DynamicApiResetPasswordCallback<Entity>;
  resetPasswordUseInterceptors?: Type<NestInterceptor>[];
  changePasswordCallback?: DynamicApiServiceCallback<Entity>;
  changePasswordAbilityPredicate?: AuthAbilityPredicate;
  changePasswordUseInterceptors?: Type<NestInterceptor>[];
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
  extraImports?: ModuleMetadata['imports'];
  extraProviders?: ModuleMetadata['providers'];
  extraControllers?: ModuleMetadata['controllers'];
};

export type {
  DynamicApiAuthOptions,
  DynamicApiRegisterOptions,
  DynamicApiUpdateAccountOptions,
  DynamicApiJWTOptions,
  DynamicApiLoginOptions,
  DynamicApiResetPasswordOptions,
};
