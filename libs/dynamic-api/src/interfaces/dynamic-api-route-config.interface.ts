import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';
import { DTOsBundle } from './dynamic-api-route-dtos-bundle.type';
import { RouteType } from './dynamic-api-route-type.type';

interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  isPublic?: boolean;
  description?: string;
  version?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: AbilityPredicate<Entity>;
}

export { DynamicAPIRouteConfig };
