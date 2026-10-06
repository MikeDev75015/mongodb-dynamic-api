import {
  CanActivate,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Type,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { AuthAbilityPredicate, CachePurgeConfig, CachePurgeOptions, DynamicApiControllerOptions } from '../../interfaces';
import { MongoDBDynamicApiLogger } from '../../logger/mongo-dynamic-api.logger';
import { BaseEntity } from '../../models';
// Concrete path — see the same note in interceptors/dynamic-api-cache.interceptor.ts.
import { DynamicApiCacheService } from '../../services/dynamic-api-cache/dynamic-api-cache.service';

const logger = new MongoDBDynamicApiLogger('DynamicApiModule');

class CachePurgePresenter {
  @ApiProperty({ type: Boolean })
  purged: boolean;
}

/** @internal Not part of the public API. `forRoot` and `controllerOptions` `cachePurge`, merged. */
interface ResolvedCachePurgeOptions {
  enabled: boolean;
  authAbilityPredicate: AuthAbilityPredicate<unknown> | undefined;
}

const toCachePurgeOptions = (options: CachePurgeConfig | undefined): CachePurgeOptions =>
  options === false ? { enabled: false } : options ?? {};

/** @internal Not part of the public API. Entity options win over global ones, field by field. */
function resolveCachePurgeOptions(
  globalOptions: CachePurgeConfig | undefined,
  featureOptions: CachePurgeConfig | undefined,
): ResolvedCachePurgeOptions {
  const global = toCachePurgeOptions(globalOptions);
  const feature = toCachePurgeOptions(featureOptions);

  return {
    enabled: feature.enabled ?? global.enabled ?? true,
    authAbilityPredicate: feature.authAbilityPredicate ?? global.authAbilityPredicate,
  };
}

function createCachePurgeGuard(authAbilityPredicate: AuthAbilityPredicate<unknown>): Type<CanActivate> {
  class CachePurgeGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const { user } = context.switchToHttp().getRequest<{ user?: unknown }>();

      if (!user || !authAbilityPredicate(user)) {
        throw new ForbiddenException('Access Denied');
      }

      return true;
    }
  }

  return CachePurgeGuard;
}

function createCachePurgeController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  { path, apiTag, version, isPublic }: DynamicApiControllerOptions<Entity>,
  authAbilityPredicate?: AuthAbilityPredicate<unknown>,
): Type {
  const tag = apiTag || entity.name;
  const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

  if (isAuthEnabled && !isPublic && !authAbilityPredicate) {
    logger.warn(
      `[Cache Purge] DELETE /${path}/cache on ${entity.name} is open to every authenticated user. `
      + 'Set cachePurge.authAbilityPredicate (forRoot or controllerOptions) to restrict it, '
      + 'or cachePurge: false to remove the route.',
    );
  }

  @Controller({ path, version })
  @ApiTags(tag)
  @UseInterceptors(ClassSerializerInterceptor)
  class CachePurgeController {
    constructor(private readonly cacheService: DynamicApiCacheService) {}

    @Delete('cache')
    async purgeCache(): Promise<CachePurgePresenter> {
      await this.cacheService.invalidate(entity);
      return { purged: true };
    }
  }

  const descriptor = Object.getOwnPropertyDescriptor(CachePurgeController.prototype, 'purgeCache');

  ApiOperation({
    operationId: `purgeCache${tag}${version ? 'V' + version : ''}`,
    summary: `Purge cache for ${tag}`,
  })(CachePurgeController.prototype, 'purgeCache', descriptor);

  ApiResponse({
    type: CachePurgePresenter,
  })(CachePurgeController.prototype, 'purgeCache', descriptor);

  if (isPublic) {
    Public()(CachePurgeController.prototype, 'purgeCache', descriptor);
  } else if (isAuthEnabled) {
    ApiBearerAuth()(CachePurgeController.prototype, 'purgeCache', descriptor);
  }

  if (authAbilityPredicate) {
    UseGuards(createCachePurgeGuard(authAbilityPredicate))(CachePurgeController.prototype, 'purgeCache', descriptor);
    ApiForbiddenResponse({ description: 'Access Denied' })(CachePurgeController.prototype, 'purgeCache', descriptor);
  }

  Object.defineProperty(CachePurgeController, 'name', {
    value: `CachePurge${tag}${version ? 'V' + version : ''}Controller`,
    writable: false,
  });

  return CachePurgeController;
}

export { CachePurgePresenter, ResolvedCachePurgeOptions, createCachePurgeController, resolveCachePurgeOptions };


