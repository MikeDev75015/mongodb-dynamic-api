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
import { ValidatorPipe } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { provideName } from '../../helpers';
import {
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  BeforeSaveListCallback,
  AfterSaveCallback,
  DynamicAPIServiceProvider,
  GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DynamicApiBroadcastService } from '../../services';
import { BaseDuplicateManyService } from './base-duplicate-many.service';
import { DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyControllerMixin } from './duplicate-many-controller.mixin';
import { DuplicateManyGatewayConstructor } from './duplicate-many-gateway.interface';
import { DuplicateManyGatewayMixin } from './duplicate-many-gateway.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

function createDuplicateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: AfterSaveCallback<Entity> | undefined,
  beforeSaveCallback: BeforeSaveListCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class DuplicateManyService extends BaseDuplicateManyService<Entity> {
    protected readonly entity = entity;
    protected readonly beforeSaveCallback = beforeSaveCallback;
    protected readonly callback = callback;

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

  Object.defineProperty(DuplicateManyService, 'name', {
    value: provideName('DuplicateMany', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('DuplicateMany', displayedName, version, 'Service'),
    useClass: DuplicateManyService,
  };
}

function createDuplicateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DuplicateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DuplicateManyController extends DuplicateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('DuplicateMany', displayedName, version, 'Service'))
      protected readonly service: DuplicateManyService<Entity>,
      @Optional() @Inject(DynamicApiBroadcastService)
      protected readonly broadcastService?: DynamicApiBroadcastService,
    ) {
      super(service, broadcastService);
    }
  }

  Object.defineProperty(DuplicateManyController, 'name', {
    value: `${provideName('DuplicateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return DuplicateManyController;
}

function createDuplicateManyGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): DuplicateManyGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DuplicateManyGateway extends DuplicateManyGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: DuplicateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(DuplicateManyGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return DuplicateManyGateway;
}

export { createDuplicateManyController, createDuplicateManyGateway, createDuplicateManyServiceProvider };
