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
import { BaseCreateManyService } from './base-create-many.service';
import { CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyService } from './create-many-service.interface';

function createCreateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class CreateManyService extends BaseCreateManyService<Entity> {
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

  Object.defineProperty(CreateManyService, 'name', {
    value: provideName('CreateMany', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('CreateMany', entity.name, version, 'Service'),
    useClass: CreateManyService,
  };
}

function createCreateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): CreateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class CreateManyController extends CreateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('CreateMany', entity.name, version, 'Service'))
      protected readonly service: CreateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateManyController, 'name', {
    value: `${provideName('CreateMany', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return CreateManyController;
}

export { createCreateManyController, createCreateManyServiceProvider };
