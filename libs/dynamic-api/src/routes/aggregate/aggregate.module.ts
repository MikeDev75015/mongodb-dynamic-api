import { DynamicModule, Module, ModuleMetadata, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName } from '../../helpers/format.helper';
import { initializeConfigFromOptions } from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createAggregateController,
  createAggregateGateway,
  createAggregateServiceProvider,
} from './aggregate.helper';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
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
    extraImports?: ModuleMetadata['imports'],
    extraProviders?: ModuleMetadata['providers'],
    extraControllers?: ModuleMetadata['controllers'],
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
    const ServiceProvider = createAggregateServiceProvider(
      entity,
      displayedName,
      version,
      { callback: routeConfig.callback, retry: routeConfig.callbackRetry },
      routeConfig.abilityPredicate,
      routeConfig.predicateBehavior,
    );

    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions') ?? null;

    return {
      module: AggregateModule,
      imports: [databaseModule, ...(extraImports || [])],
      controllers: [controller, ...(extraControllers || [])],
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
        ...(extraProviders || []),
      ],
    };
  }
}
