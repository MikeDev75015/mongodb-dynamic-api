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

/** @deprecated Internal API — will be removed from public exports in v5. */
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
