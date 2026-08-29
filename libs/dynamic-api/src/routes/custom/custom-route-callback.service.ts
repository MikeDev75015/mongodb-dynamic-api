import { Model } from 'mongoose';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services';

/**
 * Minimal concrete `BaseService` subclass instantiated purely to reach its (otherwise
 * protected-only) `getCallbackMethods()`. Every `CallbackMethods` entry takes its own `entity`
 * argument and resolves its own model independently (via `DynamicApiGlobalStateService`), so
 * leaving `entity`/`abilityPredicate` unset here is safe — nothing in the bundle reads them.
 *
 * Gives a custom route handler (`CustomRouteContext.methods`) the same recompute/raw-write
 * primitives `beforeSaveCallback`/`callback` already get, without requiring the generated
 * controller/gateway itself to extend `BaseService` (neither otherwise needs to). Shared by
 * `createCustomRouteController` (HTTP) and `createCustomRouteGateway` (WebSocket).
 */
class CustomRouteCallbackService<E extends BaseEntity> extends BaseService<E> {
  constructor(model: Model<E>) {
    super(model);
  }
}

export { CustomRouteCallbackService };
