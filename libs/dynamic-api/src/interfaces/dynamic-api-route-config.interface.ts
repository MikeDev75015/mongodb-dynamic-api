import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { DynamicApiServiceCallback } from './dynamic-api-service-callback.interface';
import { DynamicApiWebSocketOptions } from './dynamic-api-web-socket.interface';

interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  isPublic?: boolean;
  description?: string;
  version?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
  webSocket?: DynamicApiWebSocketOptions;
}

export { DynamicAPIRouteConfig };
