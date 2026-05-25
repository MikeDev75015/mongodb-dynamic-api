import { DynamicModule, Module } from '@nestjs/common';
import {
  DYNAMIC_API_PRESENCE_ADAPTER,
  PresenceRegisterOptions,
} from '../../interfaces';
import { DynamicApiModule } from '../../dynamic-api.module';
import { InMemoryPresenceAdapter } from './adapters/in-memory-presence.adapter';
import { RedisPresenceAdapter } from './adapters/redis-presence.adapter';
import { PresenceController } from './presence.controller';
import { createPresenceGateway } from './presence.gateway';

/**
 * Standalone NestJS module providing WebSocket presence tracking.
 *
 * ### Usage
 * ```typescript
 * // In-memory (single instance / dev)
 * DynamicApiPresenceModule.register({ adapter: 'memory' })
 *
 * // Redis (multi-instance / production) with custom TTL
 * DynamicApiPresenceModule.register({
 *   adapter: 'redis',
 *   redisUrl: 'redis://localhost:6379',
 *   redisTtlSeconds: 90,
 *   enableController: true,
 * })
 * ```
 *
 * Imported in `AppModule` alongside `DynamicApiModule.forRoot(...)`.
 * The `PresenceGateway` shares the same WebSocket options as existing gateways
 * (same namespace / port) so no second socket server is spun up (Option B).
 */
@Module({})
export class DynamicApiPresenceModule {
  static register(options: PresenceRegisterOptions): DynamicModule {
    const {
      adapter,
      redisUrl,
      redisTtlSeconds,
      enableController = false,
    } = options;

    if (adapter === 'redis' && !redisUrl) {
      throw new Error(
        'DynamicApiPresenceModule: `redisUrl` is required when adapter is "redis".',
      );
    }

    const adapterInstance =
      adapter === 'redis'
        ? new RedisPresenceAdapter(redisUrl!, redisTtlSeconds)
        : new InMemoryPresenceAdapter();

    const adapterProvider = {
      provide: DYNAMIC_API_PRESENCE_ADAPTER,
      useValue: adapterInstance,
    };

    const gatewayOptions =
      DynamicApiModule.state.get('gatewayOptions') ??
      DynamicApiModule.state.get('broadcastGatewayOptions') ??
      {};

    const GatewayClass = createPresenceGateway(gatewayOptions);

    return {
      module: DynamicApiPresenceModule,
      providers: [
        adapterProvider,
        { provide: GatewayClass, useClass: GatewayClass },
      ],
      controllers: enableController ? [PresenceController] : [],
      exports: [DYNAMIC_API_PRESENCE_ADAPTER],
    };
  }
}

