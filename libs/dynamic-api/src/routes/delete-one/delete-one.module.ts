import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { initializeConfigFromOptions } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createDeleteOneController,
  createDeleteOneGateway,
  createDeleteOneServiceProvider,
} from './delete-one.helper';

@Module({})
export class DeleteOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
  ): DynamicModule {
    const controller = createDeleteOneController(
      entity,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteOneServiceProvider(entity, version);

    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions');

    return {
      module: DeleteOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [
        ServiceProvider,
        ...(
          gatewayOptions ? [
            createDeleteOneGateway(
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
