import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createCreateOneController,
  createCreateOneServiceProvider,
} from './create-one.helper';

@Module({})
export class CreateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createCreateOneController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createCreateOneServiceProvider(entity, version, routeConfig.callback);

    return {
      module: CreateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
