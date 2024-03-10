import {
  CreateManyModule,
  CreateOneModule,
  DeleteManyModule,
  DeleteOneModule,
  DuplicateOneModule,
  GetManyModule,
  GetOneModule,
  ReplaceOneModule,
  UpdateManyModule,
  UpdateOneModule,
} from '../routes';

type RouteModule =
  CreateManyModule
  | CreateOneModule
  | DeleteManyModule
  | DeleteOneModule
  | DuplicateOneModule
  | GetManyModule
  | GetOneModule
  | ReplaceOneModule
  | UpdateManyModule
  | UpdateOneModule;

export { RouteModule };
