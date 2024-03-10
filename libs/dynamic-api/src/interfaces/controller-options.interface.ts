import { ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { DynamicApiControllerCaslAbilityPredicate } from './dynamic-api-casl-ability.interface';

interface ControllerOptions<Entity extends BaseEntity> {
  path: string;
  apiTag?: string;
  version?: string;
  isPublic?: boolean;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicates?: DynamicApiControllerCaslAbilityPredicate<Entity>[];
}

export { ControllerOptions };
