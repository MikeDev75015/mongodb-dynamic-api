import { applyDecorators } from '@nestjs/common';
import { DynamicApiDecoratorBuilder } from '../interfaces';
import { BaseEntity } from '../models';

/** @deprecated Internal API — will be removed from public exports in v5. */
function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: DynamicApiDecoratorBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
