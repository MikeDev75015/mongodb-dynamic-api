import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { initializeConfigFromOptions } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createDeleteManyController,
  createDeleteManyGateway,
  createDeleteManyServiceProvider,
} from './delete-many.helper';

@Module({})
export class DeleteManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
  ): DynamicModule {
    const controller = createDeleteManyController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteManyServiceProvider(entity, version);

    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions');

    return {
      module: DeleteManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [
        ServiceProvider,
        ...(
          gatewayOptions ? [
            createDeleteManyGateway(
              entity,
              controllerOptions,
              routeConfig,
              version,
              validationPipeOptions,
              gatewayOptions,
            ),
          ] : []
        ),
      ],
    };
  }
}
