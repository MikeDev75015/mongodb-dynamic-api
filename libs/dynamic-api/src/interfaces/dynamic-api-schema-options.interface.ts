import { IndexDefinition, IndexOptions } from 'mongoose';

type HookEvent =
  | 'find'
  | 'findOne'
  | 'save'
  | 'findOneAndUpdate'
  | 'findOneAndReplace'
  | 'deleteOne';

type SchemaHook = {
  type: HookEvent;
  method: 'pre' | 'post';
  callback: (...args: any[]) => void;
  options?: { document?: boolean; query?: boolean };
};

interface DynamicAPISchemaOptionsInterface {
  indexes?: {
    fields: IndexDefinition;
    options?: IndexOptions;
  }[];
  hooks?: SchemaHook[];
}

export type { SchemaHook, DynamicAPISchemaOptionsInterface };
