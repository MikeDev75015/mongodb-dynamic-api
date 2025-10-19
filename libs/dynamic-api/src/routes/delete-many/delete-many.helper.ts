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
  DynamicAPIServiceProvider,
  GatewayOptions,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { DeleteManyGatewayConstructor, DeleteManyGatewayMixin, DeleteManyService } from '../delete-many';
import { BaseDeleteManyService } from './base-delete-many.service';
import { DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyControllerMixin } from './delete-many-controller.mixin';

function createDeleteManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class DeleteManyService extends BaseDeleteManyService<Entity> {
    protected readonly entity = entity;

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

  Object.defineProperty(DeleteManyService, 'name', {
    value: provideName('DeleteMany', displayedName, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('DeleteMany', displayedName, version, 'Service'),
    useClass: DeleteManyService,
  };
}

function createDeleteManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DeleteManyController extends DeleteManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('DeleteMany', displayedName, version, 'Service'))
      protected readonly service: DeleteManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DeleteManyController, 'name', {
    value: `${provideName('DeleteMany', displayedName, version, 'Controller')}`,
    writable: false,
  });

  return DeleteManyController;
}

function createDeleteManyGateway<Entity extends BaseEntity>(
  entity: Type<Entity>,
  displayedName: string,
  { useInterceptors = [], ...controllerOptions }: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
  gatewayOptions: GatewayOptions = {},
): DeleteManyGatewayConstructor<Entity> {
  @WebSocketGateway(gatewayOptions)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor, ...useInterceptors)
  class DeleteManyGateway extends DeleteManyGatewayMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName(routeConfig.type, displayedName, version, 'Service'))
      protected readonly service: DeleteManyService<Entity>,
      protected readonly jwtService: JwtService,
    ) {
      super(service, jwtService);
    }
  }

  Object.defineProperty(DeleteManyGateway, 'name', {
    value: `${provideName(routeConfig.type, displayedName, version, 'Gateway')}`,
    writable: false,
  });

  return DeleteManyGateway;
}

export { createDeleteManyController, createDeleteManyGateway, createDeleteManyServiceProvider };
