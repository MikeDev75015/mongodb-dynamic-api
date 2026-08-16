import { DynamicModule, Module, ModuleMetadata, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName, initializeConfigFromOptions } from '../../helpers';
import { UpdateManyRouteConfig, DynamicApiControllerOptions, DynamicApiWebSocketOptions } from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import {
  createUpdateManyController,
  createUpdateManyGateway,
  createUpdateManyServiceProvider,
} from './update-many.helper';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
@Module({})
export class UpdateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: UpdateManyRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
    extraImports?: ModuleMetadata['imports'],
    extraProviders?: ModuleMetadata['providers'],
    extraControllers?: ModuleMetadata['controllers'],
  ): DynamicModule {
    const displayedName = getDisplayedName(controllerOptions.apiTag, entity.name, routeConfig.subPath);

    const controller = createUpdateManyController(
      entity,
      displayedName,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createUpdateManyServiceProvider(
      entity, displayedName, version,
      { callback: routeConfig.callback, retry: routeConfig.callbackRetry, auditLog: routeConfig.auditLog },
      routeConfig.beforeSaveCallback,
    );

    const hasBroadcast = !!routeConfig.broadcast;
    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions') ?? null;


    return {
      module: UpdateManyModule,
      imports: [databaseModule, ...(extraImports || [])],
      controllers: [controller, ...(extraControllers || [])],
      providers: [
        ServiceProvider,
        ...(hasBroadcast ? [DynamicApiBroadcastService] : []),
        ...(
          gatewayOptions ? [
            createUpdateManyGateway(
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
