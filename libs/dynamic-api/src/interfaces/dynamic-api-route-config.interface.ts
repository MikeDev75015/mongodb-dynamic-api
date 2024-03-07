import { Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { DynamicApiRouteCaslAbilityPredicate } from './dynamic-api-casl-ability.interface';

type RouteType =
  | 'CreateMany'
  | 'CreateOne'
  | 'DeleteMany'
  | 'DeleteOne'
  | 'DuplicateMany'
  | 'DuplicateOne'
  | 'GetMany'
  | 'GetOne'
  | 'ReplaceOne'
  | 'UpdateMany'
  | 'UpdateOne';

type DTOsBundle = {
  query?: Type;
  param?: Type;
  body?: Type;
  presenter?: Type;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface DynamicAPIRouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  description?: string;
  version?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
  abilityPredicate?: DynamicApiRouteCaslAbilityPredicate<Entity>;
}

export { DTOsBundle, RouteType, DynamicAPIRouteConfig };
