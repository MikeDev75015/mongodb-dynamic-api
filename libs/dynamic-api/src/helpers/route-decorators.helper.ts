import { applyDecorators } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '../builders';
import { BaseEntity } from '../models';

function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: RouteDecoratorsBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
