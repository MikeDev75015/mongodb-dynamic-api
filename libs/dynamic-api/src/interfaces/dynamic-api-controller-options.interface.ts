import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { DynamicApiControllerAbilityPredicate } from './dynamic-api-casl-ability.interface';

interface DynamicApiControllerOptions<Entity extends BaseEntity> {
  path: string;
  apiTag?: string;
  version?: string;
  isPublic?: boolean;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicates?: DynamicApiControllerAbilityPredicate<Entity>[];
}

export { DynamicApiControllerOptions };
