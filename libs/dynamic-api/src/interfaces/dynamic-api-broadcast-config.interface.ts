import { BroadcastAbilityPredicate, BroadcastRooms } from './dynamic-api-ability.interface';

interface BroadcastConfig<ResponseData extends object, User = unknown> {
  enabled: boolean | BroadcastAbilityPredicate<ResponseData, User>;
  eventName?: string;
  rooms?: BroadcastRooms<ResponseData, User>;
}

export { BroadcastConfig };

