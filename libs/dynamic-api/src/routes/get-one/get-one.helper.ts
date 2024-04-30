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
import { BaseGetOneService } from './base-get-one.service';
import { GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneControllerMixin } from './get-one-controller.mixin';
import { GetOneService } from './get-one-service.interface';

function createGetOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class GetOneService extends BaseGetOneService<Entity> {
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

  Object.defineProperty(GetOneService, 'name', {
    value: provideName('GetOne', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('GetOne', entity.name, version, 'Service'),
    useClass: GetOneService,
  };
}

function createGetOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): GetOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class GetOneController extends GetOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('GetOne', entity.name, version, 'Service'))
      protected readonly service: GetOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetOneController, 'name', {
    value: `${provideName('GetOne', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return GetOneController;
}

export { createGetOneController, createGetOneServiceProvider };
