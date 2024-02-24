import { BaseEntity } from '@dynamic-api';
import { applyDecorators } from '@nestjs/common';
import { RouteDecoratorsBuilder } from '@dynamic-api/builders';

function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: RouteDecoratorsBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
