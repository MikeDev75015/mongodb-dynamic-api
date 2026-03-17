import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Inject,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';
import { Public } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { DynamicApiControllerOptions } from '../../interfaces';
import { BaseEntity } from '../../models';

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
    constructor(
      @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    @Delete('cache')
    async purgeCache(): Promise<CachePurgePresenter> {
      await this.cacheManager.clear();
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


