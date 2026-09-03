import { DynamicModule, Module, ModuleMetadata, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName } from '../../helpers/format.helper';
import { initializeConfigFromOptions } from '../../helpers/socket-config.helper';
import { DeleteManyRouteConfig, DynamicApiControllerOptions, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import {
  createDeleteManyController,
  createDeleteManyGateway,
  createDeleteManyServiceProvider,
} from './delete-many.helper';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
@Module({})
export class DeleteManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: DeleteManyRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
    extraImports?: ModuleMetadata['imports'],
    extraProviders?: ModuleMetadata['providers'],
    extraControllers?: ModuleMetadata['controllers'],
  ): DynamicModule {
    const displayedName = getDisplayedName(controllerOptions.apiTag, entity.name, routeConfig.subPath);

    const controller = createDeleteManyController(
      entity,
      displayedName,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteManyServiceProvider(
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
      module: DeleteManyModule,
      imports: [databaseModule, ...(extraImports || [])],
      controllers: [controller, ...(extraControllers || [])],
      providers: [
        ServiceProvider,
        ...(hasBroadcast ? [DynamicApiBroadcastService] : []),
        ...(
          gatewayOptions ? [
            createDeleteManyGateway(
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
