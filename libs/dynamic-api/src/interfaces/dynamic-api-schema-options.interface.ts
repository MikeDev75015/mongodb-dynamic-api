import { IndexDefinition, IndexOptions, Schema } from 'mongoose';
import { RouteType } from './dynamic-api-route-type.type';

/**
 * Type representing the event for which a hook can be registered.
 */
type HookEvent = RouteType;

/**
 * Type representing the MongoDB query operations.
 */
type MongoDBQuery =
  | 'deleteMany'
  | 'deleteOne'
  | 'find'
  | 'findOne'
  | 'findOneAndReplace'
  | 'findOneAndUpdate'
  | 'save'
  | 'updateMany'
  | 'updateOne';

/**
 * Type representing a schema hook.
 * @property {HookEvent} type - The event for which the hook is registered.
 * @property {'pre' | 'post'} method - The timing of the hook (before or after the event).
 * @property {(...args: any[]) => void} callback - The function to be called when the hook is triggered.
 * @property {{ document?: boolean; query?: boolean }} options - Optional settings for the hook.
 */
type SchemaHook = {
  type: HookEvent;
  method: 'pre' | 'post';
  callback: (...args: any[]) => void;
  options?: { document?: boolean; query?: boolean };
};

/**
 * Map associating route types with MongoDB query operations.
 */
export const queryByRouteTypeMap: Map<HookEvent, { query: MongoDBQuery, softDeletableQuery?: MongoDBQuery }> = new Map([
  ['CreateMany', { query: 'save' }],
  ['CreateOne', { query: 'save' }],
  ['DeleteMany', { query: 'deleteMany', softDeletableQuery: 'updateMany' }],
  ['DeleteOne', { query: 'deleteOne', softDeletableQuery: 'updateOne' }],
  ['DuplicateMany', { query: 'save' }],
  ['DuplicateOne', { query: 'save' }],
  ['GetMany', { query: 'find' }],
  ['GetOne', { query: 'findOne' }],
  ['ReplaceOne', { query: 'findOneAndReplace' }],
  ['UpdateMany', { query: 'updateMany' }],
  ['UpdateOne', { query: 'findOneAndUpdate' }],
]);

/**
 * Interface representing the options that can be passed to the DynamicAPISchemaOptions decorator.
 * @property {{ fields: IndexDefinition; options?: IndexOptions }[]} indexes - Optional array of index definitions.
 * @property {SchemaHook[]} hooks - Optional array of schema hooks.
 */
interface DynamicAPISchemaOptionsInterface {
  indexes?: {
    fields: IndexDefinition;
    options?: IndexOptions;
  }[];
  hooks?: SchemaHook[];
  customInit?: (schema: Schema) => void;
}

export type { SchemaHook, DynamicAPISchemaOptionsInterface };
