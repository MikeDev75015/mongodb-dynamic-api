import {
  ClassSerializerInterceptor,
  Controller,
  Inject,
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
  DynamicAPIRouteConfig, DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceCallback,
  DynamicAPIServiceProvider, GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateOneService } from './base-create-one.service';
import { CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneGatewayConstructor } from './create-one-gateway.interface';
import { CreateOneGatewayMixin } from './create-one-gateway.mixin';
import { CreateOneService } from './create-one-service.interface';

function createCreateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
  beforeSaveCallback: DynamicApiServiceBeforeSaveCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class CreateOneService extends BaseCreateOneService<Entity> {
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

  Object.defineProperty(CreateOneService, 'name', {
    value: provideName('CreateOne', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('CreateOne', displayedName, version, 'Service'),
    useClass: CreateOneService,
  };
}

function createCreateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): CreateOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class CreateOneController extends CreateOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('CreateOne', displayedName, version, 'Service'))
      protected readonly service: CreateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateOneController, 'name', {
    value: `${provideName('CreateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return CreateOneController;
}

function createCreateOneGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): CreateOneGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  class CreateOneGateway extends CreateOneGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: CreateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(CreateOneGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return CreateOneGateway;
}

export { createCreateOneController, createCreateOneGateway, createCreateOneServiceProvider };
