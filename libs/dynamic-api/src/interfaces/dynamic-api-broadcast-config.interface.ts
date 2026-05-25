import { BroadcastAbilityPredicate, BroadcastRooms } from './dynamic-api-ability.interface';

interface DynamicApiBroadcastConfig<ResponseData extends object, User = unknown> {
  enabled: boolean | BroadcastAbilityPredicate<ResponseData, User>;
  eventName?: string;
  rooms?: BroadcastRooms<ResponseData, User>;
}

export { DynamicApiBroadcastConfig };

