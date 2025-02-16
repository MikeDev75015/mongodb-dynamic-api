import { BaseEntity } from '../models';
import { DynamicApiCallbackMethods } from './dynamic-api-service-callback.interface';

type DynamicApiServiceBeforeSaveCreateContext<Entity extends BaseEntity> = {
  toCreate: Partial<Entity>;
}

type DynamicApiServiceBeforeSaveUpdateContext<Entity extends BaseEntity> = {
  id: string;
  update: Partial<Entity>;
}

type DynamicApiServiceBeforeSaveCallback<Entity extends BaseEntity, Context = Record<string, unknown>> = (
  entity: Entity | undefined,
  context: Context,
  methods: DynamicApiCallbackMethods,
) => Promise<Partial<Entity>>;

export type {
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceBeforeSaveCreateContext,
  DynamicApiServiceBeforeSaveUpdateContext,
};
