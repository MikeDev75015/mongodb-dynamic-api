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

/** @internal Not part of the public API. */
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
