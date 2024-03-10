import { DynamicModule, Module, Provider, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createDeleteManyController,
  createDeleteManyServiceProvider,
} from './delete-many.helper';

@Module({})
export class DeleteManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: ControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    extraProviders?: Provider[],
  ): DynamicModule {
    const controller = createDeleteManyController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteManyServiceProvider(entity, version);

    return {
      module: DeleteManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [...(extraProviders ?? []), ServiceProvider],
    };
  }
}
