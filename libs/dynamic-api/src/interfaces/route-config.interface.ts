import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';

type RouteType =
  | 'GetMany'
  | 'GetOne'
  | 'CreateOne'
  | 'CreateMany'
  | 'UpdateOne'
  | 'ReplaceOne'
  | 'DeleteOne'
  | 'DuplicateOne';

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
}

export { DTOsBundle, RouteType, RouteConfig };
