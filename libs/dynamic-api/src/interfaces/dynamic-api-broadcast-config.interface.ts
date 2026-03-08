import { BaseEntity } from '../models';
import { AbilityPredicate } from './dynamic-api-ability.interface';

interface DynamicApiBroadcastConfig<Entity extends BaseEntity = any> {
  enabled: boolean | AbilityPredicate<Entity>;
  eventName?: string;
}

export { DynamicApiBroadcastConfig };

