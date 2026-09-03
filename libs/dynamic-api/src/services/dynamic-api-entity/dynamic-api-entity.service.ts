import { Type } from '@nestjs/common';
import { Model } from 'mongoose';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';

/**
 * Injectable-free static helper exposing the one piece of `DynamicApiGlobalStateService` that
 * consumers are meant to reach directly: resolving the Mongoose model registered for an entity
 * via `DynamicApiModule.forFeature`/`forRoot` — for code that writes to the database **outside**
 * the HTTP request cycle (a cron job, a queue consumer, a `CustomRouteConfig` handler's own
 * bespoke logic), where nothing else would otherwise give you that model.
 *
 * @example — resolving a model in a cron job, then invalidating its cache
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { Cron } from '@nestjs/schedule';
 * import { DynamicApiCacheService, DynamicApiEntityService } from 'mongodb-dynamic-api';
 * import { Conversation } from './conversation.entity';
 *
 * @Injectable()
 * export class ConversationPurgeService {
 *   constructor(private readonly cacheService: DynamicApiCacheService) {}
 *
 *   @Cron('0 * * * *')
 *   async purgeExpired() {
 *     const model = await DynamicApiEntityService.getModel(Conversation);
 *     await model.deleteMany({ expiresAt: { $lt: new Date() } });
 *
 *     // Nothing else would ever invalidate GetMany/GetOne responses cached for Conversation —
 *     // this write never goes through DynamicApiCacheInterceptor.
 *     await this.cacheService.invalidate(Conversation);
 *   }
 * }
 * ```
 */
class DynamicApiEntityService {
  /**
   * Resolves the Mongoose model registered for `entity` (via `DynamicApiModule.forFeature`/
   * `forRoot`), so it can be read from or written to outside the generated HTTP routes.
   */
  static async getModel<T = any>(entity: Type<T>): Promise<Model<T>> {
    return DynamicApiGlobalStateService.getEntityModel(entity);
  }
}

export { DynamicApiEntityService };
