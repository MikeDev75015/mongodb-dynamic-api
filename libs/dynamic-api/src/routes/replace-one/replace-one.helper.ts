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
import { BaseReplaceOneService } from './base-replace-one.service';
import { ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneControllerMixin } from './replace-one-controller.mixin';
import { ReplaceOneGatewayConstructor } from './replace-one-gateway.interface';
import { ReplaceOneGatewayMixin } from './replace-one-gateway.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

function createReplaceOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class ReplaceOneService extends BaseReplaceOneService<Entity> {
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

  Object.defineProperty(ReplaceOneService, 'name', {
    value: provideName('ReplaceOne', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('ReplaceOne', entity.name, version, 'Service'),
    useClass: ReplaceOneService,
  };
}

function createReplaceOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): ReplaceOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class ReplaceOneController extends ReplaceOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('ReplaceOne', entity.name, version, 'Service'))
      protected readonly service: ReplaceOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(ReplaceOneController, 'name', {
    value: `${provideName('ReplaceOne', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return ReplaceOneController;
}

function createReplaceOneGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): ReplaceOneGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  class ReplaceOneGateway extends ReplaceOneGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, entity.name, version, 'Service'))
      protected readonly service: ReplaceOneService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  return ReplaceOneGateway;
}

export { createReplaceOneController, createReplaceOneGateway, createReplaceOneServiceProvider };
