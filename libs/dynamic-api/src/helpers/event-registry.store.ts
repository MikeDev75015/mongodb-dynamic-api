import { MongoDBDynamicApiLogger } from '../logger/mongo-dynamic-api.logger';
import { RouteType } from '../interfaces';

type BroadcastChannel = 'http' | 'ws';

interface BroadcastEventDescriptor {
  event: string;
  routeType: RouteType | 'Auth';
  entityName: string;
  displayedName: string;
  channels: BroadcastChannel[];
  hasRoomTargeting: boolean;
  hasAbilityPredicate: boolean;
  isCustomEventName: boolean;
}

interface EventCollision {
  event: string;
  registrations: Pick<BroadcastEventDescriptor, 'routeType' | 'entityName'>[];
}

type BroadcastEventRegistration = Omit<BroadcastEventDescriptor, 'channels'> & { channel: BroadcastChannel };

/**
 * Static, process-wide registry of every broadcast event a DynamicApi application can emit.
 *
 * Populated by `getMixinData` and the auth mixins at mixin-setup time (i.e. when
 * `DynamicApiModule.forFeature`/`forRoot` is evaluated, before any request is served), and
 * consumed by `enableDynamicAPIWebSockets` to optionally fail fast on event-name collisions.
 *
 * Internal to the library — deliberately not exported from `helpers/index.ts` so it never
 * reaches the package's public surface.
 */
class DynamicApiEventRegistryStore {
  private static readonly logger = new MongoDBDynamicApiLogger(DynamicApiEventRegistryStore.name);
  private static readonly registry = new Map<string, BroadcastEventDescriptor>();
  private static readonly _collisions: EventCollision[] = [];

  static register({ channel, ...descriptor }: BroadcastEventRegistration): void {
    const existing = DynamicApiEventRegistryStore.registry.get(descriptor.event);

    if (!existing) {
      DynamicApiEventRegistryStore.registry.set(descriptor.event, { ...descriptor, channels: [channel] });
      return;
    }

    const isSameSource = existing.routeType === descriptor.routeType && existing.entityName === descriptor.entityName;

    if (!isSameSource) {
      DynamicApiEventRegistryStore.logger.warn(
        `[Broadcast Registry] Event name collision on "${descriptor.event}": already registered by `
        + `${existing.routeType}/${existing.entityName}, now also requested by ${descriptor.routeType}/${descriptor.entityName}. `
        + 'Set a unique "eventName" on one of the routes to avoid client-side ambiguity.',
      );

      DynamicApiEventRegistryStore._collisions.push({
        event: descriptor.event,
        registrations: [
          { routeType: existing.routeType, entityName: existing.entityName },
          { routeType: descriptor.routeType, entityName: descriptor.entityName },
        ],
      });
      return;
    }

    if (!existing.channels.includes(channel)) {
      existing.channels.push(channel);
    }
  }

  static getAll(): BroadcastEventDescriptor[] {
    return Array.from(DynamicApiEventRegistryStore.registry.values());
  }

  static getCollisions(): EventCollision[] {
    return [...DynamicApiEventRegistryStore._collisions];
  }

  /** Reset all registered events and collisions — useful for testing. */
  static reset(): void {
    DynamicApiEventRegistryStore.registry.clear();
    DynamicApiEventRegistryStore._collisions.length = 0;
  }
}

export { DynamicApiEventRegistryStore, BroadcastEventDescriptor, BroadcastEventRegistration, EventCollision, BroadcastChannel };
