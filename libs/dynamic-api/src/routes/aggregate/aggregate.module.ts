import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName, initializeConfigFromOptions } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createAggregateController,
  createAggregateGateway,
  createAggregateServiceProvider,
} from './aggregate.helper';

@Module({})
export class AggregateModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DynamicAPIRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
  ): DynamicModule {
    const displayedName = getDisplayedName(controllerOptions.apiTag, entity.name, routeConfig.subPath);

    const controller = createAggregateController(
      entity,
      displayedName,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createAggregateServiceProvider(entity, displayedName, version, routeConfig.callback);

    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions');

    return {
      module: AggregateModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [
        ServiceProvider,
        ...(
          gatewayOptions ? [
            createAggregateGateway(
              entity,
              displayedName,
              controllerOptions,
              routeConfig,
              version,
              validationPipeOptions,
              gatewayOptions,
            )
          ] : []
        ),
      ],
    };
  }
}
