import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';
import { ControllerOptions } from './controller-options.interface';
import { DynamicAPIRouteConfig } from './dynamic-api-route-config.interface';

interface DynamicApiOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: ControllerOptions;
  routes?: DynamicAPIRouteConfig<Entity>[];
}

export { DynamicApiOptions };
