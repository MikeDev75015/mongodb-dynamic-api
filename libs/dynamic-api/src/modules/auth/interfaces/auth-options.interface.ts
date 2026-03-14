import { ModuleMetadata, NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import {
  AuthAbilityPredicate,
  BroadcastAbilityPredicate,
  DynamicApiResetPasswordCallback,
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceCallback,
  DynamicApiWebSocketOptions,
} from '../../../interfaces';
import { BaseEntity } from '../../../models';

type DynamicApiJWTOptions = {
  secret: string;
  expiresIn?: string | number;
};

type DynamicApiAuthBroadcastConfig<Entity extends BaseEntity = any> = {
  enabled: boolean | BroadcastAbilityPredicate<Partial<Entity>>;
  eventName?: string;
  fields?: (keyof Entity)[];
};

type DynamicApiLoginOptions<Entity extends BaseEntity = any> = {
  loginField?: keyof Entity;
  passwordField?: keyof Entity;
  callback?: DynamicApiServiceCallback<Entity>;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFields?: (keyof Entity)[];
  useInterceptors?: Type<NestInterceptor>[];
  broadcast?: DynamicApiAuthBroadcastConfig<Entity>;
}

type DynamicApiGetAccountOptions<Entity extends BaseEntity = any> = {
  callback?: DynamicApiServiceCallback<Entity>;
  useInterceptors?: Type<NestInterceptor>[];
  broadcast?: DynamicApiAuthBroadcastConfig<Entity>;
};

type DynamicApiRegisterOptions<Entity extends BaseEntity = any> = {
  beforeSaveCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  protected?: boolean;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFields?: (keyof Entity | { name: keyof Entity; required?: boolean })[];
  useInterceptors?: Type<NestInterceptor>[];
  broadcast?: DynamicApiAuthBroadcastConfig<Entity>;
};

type DynamicApiUpdateAccountOptions<Entity extends BaseEntity = any> = {
  beforeSaveCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  abilityPredicate?: AuthAbilityPredicate;
  additionalFieldsToExclude?: (keyof Entity)[];
  useInterceptors?: Type<NestInterceptor>[];
  broadcast?: DynamicApiAuthBroadcastConfig<Entity>;
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
  getAccount?: DynamicApiGetAccountOptions<Entity>;
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
  DynamicApiAuthBroadcastConfig,
  DynamicApiAuthOptions,
  DynamicApiRegisterOptions,
  DynamicApiUpdateAccountOptions,
  DynamicApiGetAccountOptions,
  DynamicApiJWTOptions,
  DynamicApiLoginOptions,
  DynamicApiResetPasswordOptions,
};
