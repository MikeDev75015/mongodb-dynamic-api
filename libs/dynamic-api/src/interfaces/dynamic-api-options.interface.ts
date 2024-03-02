import { Type, ValidationPipeOptions } from '@nestjs/common';
import { BaseEntity } from '../models';
import { RouteConfig } from './route-config.interface';

interface ControllerOptions {
  path: string;
  apiTag?: string;
  version?: string;
  validationPipeOptions?: ValidationPipeOptions;
}

interface DynamicApiOptions<Entity extends BaseEntity> {
  entity: Type<Entity>;
  controllerOptions: ControllerOptions;
  routes?: RouteConfig<Entity>[];
}

export { DynamicApiOptions, ControllerOptions };
