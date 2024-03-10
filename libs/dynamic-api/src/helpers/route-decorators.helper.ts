import { applyDecorators } from '@nestjs/common';
import { DecoratorBuilder } from '../interfaces';
import { BaseEntity } from '../models';

function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: DecoratorBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
