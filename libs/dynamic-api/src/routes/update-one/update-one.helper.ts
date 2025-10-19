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
  DynamicApiServiceBeforeSaveCallback,
  DynamicApiServiceCallback,
  DynamicAPIServiceProvider,
  GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateOneService } from './base-update-one.service';
import { UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneControllerMixin } from './update-one-controller.mixin';
import { UpdateOneGatewayConstructor } from './update-one-gateway.interface';
import { UpdateOneGatewayMixin } from './update-one-gateway.mixin';
import { UpdateOneService } from './update-one-service.interface';

function createUpdateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
  beforeSaveCallback: DynamicApiServiceBeforeSaveCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class UpdateOneService extends BaseUpdateOneService<Entity> {
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

  Object.defineProperty(UpdateOneService, 'name', {
    value: provideName('UpdateOne', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('UpdateOne', displayedName, version, 'Service'),
    useClass: UpdateOneService,
  };
}

function createUpdateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): UpdateOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class UpdateOneController extends UpdateOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('UpdateOne', displayedName, version, 'Service'))
      protected readonly service: UpdateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(UpdateOneController, 'name', {
    value: `${provideName('UpdateOne', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return UpdateOneController;
}

function createUpdateOneGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): UpdateOneGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class UpdateOneGateway extends UpdateOneGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: UpdateOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(UpdateOneGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return UpdateOneGateway;
}

export { createUpdateOneController, createUpdateOneGateway, createUpdateOneServiceProvider };
