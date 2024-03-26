import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { ControllerAbilityPredicate } from './dynamic-api-casl-ability.interface';

interface DynamicApiControllerOptions<Entity extends BaseEntity> {
  path: string;
  apiTag?: string;
  version?: string;
  isPublic?: boolean;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicates?: ControllerAbilityPredicate<Entity>[];
}

export { DynamicApiControllerOptions };
