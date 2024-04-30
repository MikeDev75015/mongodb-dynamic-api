import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';
import { DynamicApiServiceCallback } from './dynamic-api-service-callback.interface';

interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  isPublic?: boolean;
  description?: string;
  version?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
  callback?: DynamicApiServiceCallback<Entity>;
}

export { DynamicAPIRouteConfig };
