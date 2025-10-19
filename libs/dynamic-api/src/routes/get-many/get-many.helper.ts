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
  DynamicAPIRouteConfig,
  DynamicApiServiceCallback,
  DynamicAPIServiceProvider,
  GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseGetManyService } from './base-get-many.service';
import { GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyControllerMixin } from './get-many-controller.mixin';
import { GetManyGatewayConstructor } from './get-many-gateway.interface';
import { GetManyGatewayMixin } from './get-many-gateway.mixin';
import { GetManyService } from './get-many-service.interface';

function createGetManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class GetManyService extends BaseGetManyService<Entity> {
    protected readonly entity = entity;
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

  Object.defineProperty(GetManyService, 'name', {
    value: provideName('GetMany', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('GetMany', displayedName, version, 'Service'),
    useClass: GetManyService,
  };
}

function createGetManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): GetManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class GetManyController extends GetManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('GetMany', displayedName, version, 'Service'))
      protected readonly service: GetManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetManyController, 'name', {
    value: `${provideName('GetMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return GetManyController;
}

function createGetManyGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): GetManyGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class GetManyGateway extends GetManyGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: GetManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(GetManyGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return GetManyGateway;
}

export { createGetManyController, createGetManyGateway, createGetManyServiceProvider };
