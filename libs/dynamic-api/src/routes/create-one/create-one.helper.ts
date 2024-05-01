import {
  ClassSerializerInterceptor,
  Controller,
  Inject,
  Type,
  UseInterceptors,
  ValidationPipeOptions,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { ValidatorPipe } from '../../decorators';
import { DynamicApiModule } from '../../dynamic-api.module';
import { provideName } from '../../helpers';
import {
  DynamicApiControllerOptions,
  DynamicAPIRouteConfig,
  DynamicApiServiceCallback,
  DynamicAPIServiceProvider,
} from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateOneService } from './base-create-one.service';
import { CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneService } from './create-one-service.interface';

function createCreateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class CreateOneService extends BaseCreateOneService<Entity> {
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

  Object.defineProperty(CreateOneService, 'name', {
    value: provideName('CreateOne', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('CreateOne', entity.name, version, 'Service'),
    useClass: CreateOneService,
  };
}

function createCreateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
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
      @Inject(provideName('CreateOne', entity.name, version, 'Service'))
      protected readonly service: CreateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateOneController, 'name', {
    value: `${provideName('CreateOne', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return CreateOneController;
}

export { createCreateOneController, createCreateOneServiceProvider };
