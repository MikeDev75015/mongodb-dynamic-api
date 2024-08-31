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
  AggregateModule,
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
  | UpdateOneModule
  | AggregateModule;

export { RouteModule };
