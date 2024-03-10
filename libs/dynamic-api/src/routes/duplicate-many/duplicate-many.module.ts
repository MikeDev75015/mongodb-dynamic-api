import { DynamicModule, Module, Provider, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createDuplicateManyController, createDuplicateManyServiceProvider } from './duplicate-many.helper';

@Module({})
export class DuplicateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: ControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    extraProviders?: Provider[],
  ): DynamicModule {
    const controller = createDuplicateManyController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDuplicateManyServiceProvider(entity, version);

    return {
      module: DuplicateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [...(extraProviders ?? []), ServiceProvider],
    };
  }
}
