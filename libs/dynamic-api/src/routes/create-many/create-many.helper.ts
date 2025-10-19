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
  DynamicAPIServiceProvider, GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateManyService } from './base-create-many.service';
import { CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyGatewayConstructor } from './create-many-gateway.interface';
import { CreateManyGatewayMixin } from './create-many-gateway.mixin';
import { CreateManyService } from './create-many-service.interface';

function createCreateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class CreateManyService extends BaseCreateManyService<Entity> {
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

  Object.defineProperty(CreateManyService, 'name', {
    value: provideName('CreateMany', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('CreateMany', displayedName, version, 'Service'),
    useClass: CreateManyService,
  };
}

function createCreateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): CreateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class CreateManyController extends CreateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('CreateMany', displayedName, version, 'Service'))
      protected readonly service: CreateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateManyController, 'name', {
    value: `${provideName('CreateMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return CreateManyController;
}

function createCreateManyGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): CreateManyGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class CreateManyGateway extends CreateManyGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: CreateManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(CreateManyGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return CreateManyGateway;
}

export { createCreateManyController, createCreateManyGateway, createCreateManyServiceProvider };
