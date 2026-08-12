import { applyDecorators } from '@nestjs/common';
import { DynamicApiDecoratorBuilder } from '../interfaces';
import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: DynamicApiDecoratorBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
