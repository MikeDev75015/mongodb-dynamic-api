import { BroadcastAbilityPredicate, BroadcastRooms } from './dynamic-api-ability.interface';

interface DynamicApiBroadcastConfig<ResponseData extends object> {
  enabled: boolean | BroadcastAbilityPredicate<ResponseData>;
  eventName?: string;
  rooms?: BroadcastRooms<ResponseData>;
}

export { DynamicApiBroadcastConfig };

