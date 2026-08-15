import { DynamicModule, Module } from '@nestjs/common';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DynamicApiHealthCheckOptions } from '../../interfaces';
import { createHealthController } from './health.controller';

/**
 * Standalone NestJS module exposing a `GET /<path>` readiness probe (default path: `'health'`),
 * reporting the DynamicAPI MongoDB connection's live status — ready to point a Kubernetes
 * readiness/liveness probe or a Heroku health check at.
 *
 * Imported in `AppModule` alongside `DynamicApiModule.forRoot(...)`.
 *
 * ### Usage
 * ```typescript
 * @Module({
 *   imports: [
 *     DynamicApiModule.forRoot(uri),
 *     DynamicApiHealthModule.register(),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * ### Custom path
 * ```typescript
 * DynamicApiHealthModule.register({ path: 'healthz' })
 * ```
 */
@Module({})
class DynamicApiHealthModule {
  static register(options: DynamicApiHealthCheckOptions = {}): DynamicModule {
    const { path = 'health' } = options;
    const connectionName = DynamicApiModule.state.get<string>('connectionName');

    return {
      module: DynamicApiHealthModule,
      controllers: [createHealthController(connectionName, path)],
    };
  }
}

export { DynamicApiHealthModule };
