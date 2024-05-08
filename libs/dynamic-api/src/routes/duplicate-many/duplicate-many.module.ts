import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createDuplicateManyController, createDuplicateManyServiceProvider } from './duplicate-many.helper';

@Module({})
export class DuplicateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createDuplicateManyController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDuplicateManyServiceProvider(entity, version, routeConfig.callback);

    return {
      module: DuplicateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
