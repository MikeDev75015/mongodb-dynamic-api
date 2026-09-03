import {
  ClassSerializerInterceptor,
  Controller,
  Inject,
  Optional,
  Type,
  UseInterceptors,
  ValidationPipeOptions,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { WebSocketGateway } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { ValidatorPipe } from '../../decorators/validator-pipe.decorator';
import { DynamicApiModule } from '../../dynamic-api.module';
import { provideName } from '../../helpers/format.helper';
import { AfterSaveCallbackConfig } from '../../interfaces/dynamic-api-service-callback.interface';
import {
  DynamicApiControllerOptions,
  DynamicApiRouteConfig,
  BeforeSaveDeleteCallback,
  BeforeDeleteCallback,
  BeforeSaveDeleteContext,
  DynamicApiServiceProvider,
  GatewayOptions,
  CascadeConfig,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services/dynamic-api-broadcast/dynamic-api-broadcast.service';
import { BaseDeleteOneService } from './base-delete-one.service';
import { DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneControllerMixin } from './delete-one-controller.mixin';
import { DeleteOneGatewayConstructor } from './delete-one-gateway.interface';
import { DeleteOneGatewayMixin } from './delete-one-gateway.mixin';
import { DeleteOneService } from './delete-one-service.interface';

function createDeleteOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  afterSave: AfterSaveCallbackConfig<Entity> | undefined,
  beforeSaveCallback: BeforeSaveDeleteCallback<Entity> | undefined,
  beforeDeleteCallback?: BeforeDeleteCallback<Entity, BeforeSaveDeleteContext> | undefined,
  cascade?: CascadeConfig[] | undefined,
): DynamicApiServiceProvider {
  class DeleteOneService extends BaseDeleteOneService<Entity> {
    protected readonly entity = entity;
    protected readonly beforeSaveCallback = beforeSaveCallback;
    protected readonly beforeDeleteCallback = beforeDeleteCallback;
    protected readonly callback = afterSave?.callback;
    protected readonly cascade = cascade;
    protected readonly callbackRetry = afterSave?.retry;
    protected readonly auditLog = afterSave?.auditLog;

    constructor(
      @InjectModel(
        entity.name,
        DynamicApiModule.state.get('connectionName'),
      )
      protected readonly model: Model<Entity>,
    ) {
      super(model);
    }
  }

  Object.defineProperty(DeleteOneService, 'name', {
    value: provideName('DeleteOne', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('DeleteOne', displayedName, version, 'Service'),
    useClass: DeleteOneService,
  };
}

function createDeleteOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicApiRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DeleteOneController extends DeleteOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('DeleteOne', displayedName, version, 'Service'))
      protected readonly service: DeleteOneService<Entity>,
      @Optional() @Inject(DynamicApiBroadcastService)
      protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {
      super(service, broadcastService);
    }
  }

  Object.defineProperty(DeleteOneController, 'name', {
    value: `${provideName('DeleteOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return DeleteOneController;
}

function createDeleteOneGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicApiRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): DeleteOneGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DeleteOneGateway extends DeleteOneGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: DeleteOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(DeleteOneGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return DeleteOneGateway;
}

export { createDeleteOneController, createDeleteOneGateway, createDeleteOneServiceProvider };
