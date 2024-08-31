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
import { BaseAggregateService } from './base-aggregate.service';
import { AggregateControllerConstructor } from './aggregate-controller.interface';
import { AggregateControllerMixin } from './aggregate-controller.mixin';
import { AggregateGatewayConstructor } from './aggregate-gateway.interface';
import { AggregateGatewayMixin } from './aggregate-gateway.mixin';
import { AggregateService } from './aggregate-service.interface';

function createAggregateServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class AggregateService extends BaseAggregateService<Entity> {
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

  Object.defineProperty(AggregateService, 'name', {
    value: provideName('Aggregate', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('Aggregate', displayedName, version, 'Service'),
    useClass: AggregateService,
  };
}

function createAggregateController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): AggregateControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class AggregateController extends AggregateControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('Aggregate', displayedName, version, 'Service'))
      protected readonly service: AggregateService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(AggregateController, 'name', {
    value: `${provideName('Aggregate', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return AggregateController;
}

function createAggregateGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): AggregateGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  class AggregateGateway extends AggregateGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: AggregateService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(AggregateGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return AggregateGateway;
}

export { createAggregateController, createAggregateGateway, createAggregateServiceProvider };
