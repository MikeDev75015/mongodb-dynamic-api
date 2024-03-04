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
  | 'UpdateOne';

type DTOsBundle = {
  query?: Type;
  param?: Type;
  body?: Type;
  presenter?: Type;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RouteConfig<Entity extends BaseEntity> {
  type: RouteType;
  description?: string;
  version?: string;
  dTOs?: DTOsBundle;
  validationPipeOptions?: ValidationPipeOptions;
}

export { DTOsBundle, RouteType, RouteConfig };
