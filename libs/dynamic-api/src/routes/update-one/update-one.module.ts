import { DynamicModule, Module, Provider, Type, ValidationPipeOptions } from '@nestjs/common';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createUpdateOneController, createUpdateOneServiceProvider } from './update-one.helper';

@Module({})
export class UpdateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    extraProviders?: Provider[],
  ): DynamicModule {
    const controller = createUpdateOneController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createUpdateOneServiceProvider(entity, version, routeConfig.callback);

    return {
      module: UpdateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [...(extraProviders ?? []), ServiceProvider],
    };
  }
}
