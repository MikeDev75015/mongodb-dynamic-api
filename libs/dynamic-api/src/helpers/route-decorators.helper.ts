import { applyDecorators } from '@nestjs/common';
import { DynamicApiDecoratorBuilder } from '../interfaces';
import { BaseEntity } from '../models';

function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: DynamicApiDecoratorBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
