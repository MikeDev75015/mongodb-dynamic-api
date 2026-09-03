import { DynamicModule, Module, ModuleMetadata, Type, ValidationPipeOptions } from '@nestjs/common';
import { GatewayMetadata } from '@nestjs/websockets';
import { DynamicApiModule } from '../../dynamic-api.module';
import { getDisplayedName } from '../../helpers/format.helper';
import { initializeConfigFromOptions } from '../../helpers/socket-config.helper';
import { DynamicApiControllerOptions, DynamicApiWebSocketOptions, GetManyRouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createGetManyController, createGetManyGateway, createGetManyServiceProvider } from './get-many.helper';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
@Module({})
export class GetManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    controllerOptions: DynamicApiControllerOptions<Entity>,
    routeConfig: GetManyRouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
    webSocket?: DynamicApiWebSocketOptions,
    extraImports?: ModuleMetadata['imports'],
    extraProviders?: ModuleMetadata['providers'],
    extraControllers?: ModuleMetadata['controllers'],
  ): DynamicModule {
    const displayedName = getDisplayedName(controllerOptions.apiTag, entity.name, routeConfig.subPath);

    const controller = createGetManyController(
      entity,
      displayedName,
      controllerOptions,
      routeConfig,
      version,
      validationPipeOptions,
    );
    const ServiceProvider = createGetManyServiceProvider(
      entity,
      displayedName,
      version,
      { callback: routeConfig.callback, retry: routeConfig.callbackRetry },
      routeConfig.abilityPredicate,
      routeConfig.predicateBehavior,
      routeConfig.populate,
    );

    const gatewayOptions = webSocket
      ? initializeConfigFromOptions(webSocket)
      : DynamicApiModule.state.get<GatewayMetadata>('gatewayOptions') ?? null;

    return {
      module: GetManyModule,
      imports: [databaseModule, ...(extraImports || [])],
      controllers: [controller, ...(extraControllers || [])],
      providers: [
        ServiceProvider,
        ...(
          gatewayOptions ? [
            createGetManyGateway(
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
