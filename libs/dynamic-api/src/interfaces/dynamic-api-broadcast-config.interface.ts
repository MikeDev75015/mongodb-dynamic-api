import { BroadcastAbilityPredicate } from './dynamic-api-ability.interface';

interface DynamicApiBroadcastConfig<ResponseData extends object> {
  enabled: boolean | BroadcastAbilityPredicate<ResponseData>;
  eventName?: string;
}

export { DynamicApiBroadcastConfig };

