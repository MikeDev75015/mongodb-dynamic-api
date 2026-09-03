import { applyDecorators } from '@nestjs/common';
import { DynamicApiDecoratorBuilder } from '../interfaces/dynamic-api-decorator-builder.interface';
import { BaseEntity } from '../models';

/** @internal Not part of the public API. */
function RouteDecoratorsHelper<Entity extends BaseEntity>(
  routeDecorators: DynamicApiDecoratorBuilder<Entity>,
) {
  return applyDecorators(...routeDecorators.build());
}

export { RouteDecoratorsHelper };
