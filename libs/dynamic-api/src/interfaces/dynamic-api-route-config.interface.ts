import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { DynamicApiServiceBeforeSaveCallback } from './dynamic-api-service-before-save-callback.interface';
import { DynamicApiServiceCallback } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  isPublic?: boolean;
  description?: string;
  version?: string;
  subPath?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
  beforeSaveCallback?: DynamicApiServiceBeforeSaveCallback<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  webSocket?: DynamicApiWebSocketOptions;
  eventName?: string;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
}

export { DynamicAPIRouteConfig };
