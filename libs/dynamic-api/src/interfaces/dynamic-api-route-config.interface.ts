import { NestInterceptor, Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';
import { DynamicApiBroadcastConfig } from './dynamic-api-broadcast-config.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { DynamicApiServiceBeforeSaveCallback } from './dynamic-api-service-before-save-callback.interface';
import { DynamicApiServiceCallback } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

interface DynamicApiRouteConfig<Entity extends BaseEntity> {
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
  broadcast?: DynamicApiBroadcastConfig<Entity>;
  isArrayResponse?: boolean;
  useInterceptors?: Type<NestInterceptor>[];
}

/**
 * @deprecated Use `DynamicApiRouteConfig` instead. Will be removed in v5.
 */
type DynamicAPIRouteConfig<Entity extends BaseEntity> = DynamicApiRouteConfig<Entity>;

export { DynamicApiRouteConfig, DynamicAPIRouteConfig };
