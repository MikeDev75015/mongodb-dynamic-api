import { DynamicModule, Module, ModuleMetadata, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName } from '../../helpers/format.helper';
import { initializeConfigFromOptions } from '../../helpers/socket-config.helper';
import { DeleteOneRouteConfig, DynamicApiControllerOptions, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import {
  createDeleteOneController,
  createDeleteOneGateway,
  createDeleteOneServiceProvider,
} from './delete-one.helper';

/** @internal Not part of the public API. */
@Module({})
export class DeleteOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DeleteOneRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
    extraImports?: ModuleMetadata['imports'],
    extraProviders?: ModuleMetadata['providers'],
    extraControllers?: ModuleMetadata['controllers'],
  ): DynamicModule {
    const displayedName = getDisplayedName(controllerOptions.apiTag, entity.name, routeConfig.subPath);

    const controller = createDeleteOneController(
      entity,
      displayedName,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteOneServiceProvider(
      entity,
      displayedName,
      version,
      { callback: routeConfig.callback, retry: routeConfig.callbackRetry, auditLog: routeConfig.auditLog },
      routeConfig.beforeSaveCallback,
      routeConfig.beforeDeleteCallback,
      routeConfig.cascade,
    );

    const hasBroadcast = !!routeConfig.broadcast;
    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions') ?? null;


    return {
      module: DeleteOneModule,
      imports: [databaseModule, ...(extraImports || [])],
      controllers: [controller, ...(extraControllers || [])],
      providers: [
        ServiceProvider,
        ...(hasBroadcast ? [DynamicApiBroadcastService] : []),
        ...(
          gatewayOptions ? [
            createDeleteOneGateway(
              entity,
              displayedName,
              controllerOptions,
              routeConfig,
              version,
              validationPipeOptions,
              gatewayOptions,
            ),
          ] : []
        ),
        ...(extraProviders || []),
      ],
    };
  }
}
