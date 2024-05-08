import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createDuplicateOneController, createDuplicateOneServiceProvider } from './duplicate-one.helper';

@Module({})
export class DuplicateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createDuplicateOneController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDuplicateOneServiceProvider(entity, version, routeConfig.callback);

    return {
      module: DuplicateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
