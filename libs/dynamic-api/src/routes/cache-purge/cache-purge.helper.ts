import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DynamicApiControllerOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
// Concrete path — see the same note in interceptors/dynamic-api-cache.interceptor.ts.
import { DynamicApiCacheService } from '../../services/dynamic-api-cache/dynamic-api-cache.service';

class CachePurgePresenter {
  @ApiProperty({ type: Boolean })
  purged: boolean;
}

function createCachePurgeController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  { path, apiTag, version, isPublic }: DynamicApiControllerOptions<Entity>,
): Type {
  const tag = apiTag || entity.name;
  const isAuthEnabled = DynamicApiModule.state.get('isAuthEnabled');

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

  Object.defineProperty(CachePurgeController, 'name', {
    value: `CachePurge${tag}${version ? 'V' + version : ''}Controller`,
    writable: false,
  });

  return CachePurgeController;
}

export { CachePurgePresenter, createCachePurgeController };


