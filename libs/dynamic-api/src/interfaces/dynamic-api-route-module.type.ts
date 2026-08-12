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

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
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
