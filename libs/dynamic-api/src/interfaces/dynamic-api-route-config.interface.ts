import { Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';

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
}

export { DTOsBundle, RouteType, DynamicAPIRouteConfig };