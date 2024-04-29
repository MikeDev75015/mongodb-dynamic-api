import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { ControllerAbilityPredicate } from './dynamic-api-ability.interface';
import { RoutesConfig } from './dynamic-api-global-state.interface';

interface DynamicApiControllerOptions<Entity extends BaseEntity> {
  path: string;
  apiTag?: string;
  version?: string;
  isPublic?: boolean;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicates?: ControllerAbilityPredicate<Entity>[];
  routesConfig?: Partial<RoutesConfig>;
}

export { DynamicApiControllerOptions };
