import { ModuleMetadata, NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import {
  AuthAbilityPredicate,
  BroadcastAbilityPredicate,
  BroadcastRooms,
  DynamicApiResetPasswordCallback,
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceCallback,
  DynamicApiWebSocketOptions,
} from '../../../interfaces';
import { BaseEntity } from '../../../models';

type DynamicApiJWTOptions = {
  secret: string;
  expiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
  refreshSecret?: string;
};

type DynamicApiAuthBroadcastConfig<Entity extends BaseEntity = any> = {
  enabled: boolean | BroadcastAbilityPredicate<Partial<Entity>>;
  eventName?: string;
  fields?: (keyof Entity)[];
  rooms?: BroadcastRooms<Partial<Entity>>;
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

type DynamicApiRefreshTokenOptions<Entity extends BaseEntity = any> = {
  useInterceptors?: Type<NestInterceptor>[];
  /**
   * Field in the entity where the hashed refresh token is stored.
   * Required for server-side token rotation and revocation.
   * If not configured, logout will not invalidate existing refresh tokens server-side
   * (a warning will be logged at runtime).
   */
  refreshTokenField?: keyof Entity;
  /**
   * When true, the refresh token is sent/read as an httpOnly cookie exclusively (Bearer header disabled).
   * When false (default), the refresh token is sent/read via the Authorization Bearer header exclusively.
   */
  useCookie?: boolean;
};

type DynamicApiAuthOptions<Entity extends BaseEntity = any> = {
  userEntity: Type<Entity>;
  jwt?: DynamicApiJWTOptions;
  login?: DynamicApiLoginOptions<Entity>;
  getAccount?: DynamicApiGetAccountOptions<Entity>;
  register?: DynamicApiRegisterOptions<Entity>;
  updateAccount?: DynamicApiUpdateAccountOptions<Entity>;
  resetPassword?: Partial<DynamicApiResetPasswordOptions<Entity>>;
  refreshToken?: DynamicApiRefreshTokenOptions<Entity>;
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
  DynamicApiRefreshTokenOptions,
  DynamicApiResetPasswordOptions,
};
