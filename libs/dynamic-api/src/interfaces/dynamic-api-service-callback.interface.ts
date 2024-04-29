import { Model } from 'mongoose';
import { BaseEntity } from '../models';

type DynamicApiServiceCallback<Entity extends BaseEntity> = (
  entity: Partial<Entity>,
  model: Model<Entity>,
) => Promise<void>;

export type { DynamicApiServiceCallback };
