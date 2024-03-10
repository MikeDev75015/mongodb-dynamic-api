import { DynamicModule, Module, Provider, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createUpdateManyController,
  createUpdateManyServiceProvider,
} from './update-many.helper';

@Module({})
export class UpdateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: ControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    extraProviders?: Provider[],
  ): DynamicModule {
    const controller = createUpdateManyController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createUpdateManyServiceProvider(entity, version);

    return {
      module: UpdateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [...(extraProviders ?? []), ServiceProvider],
    };
  }
}
