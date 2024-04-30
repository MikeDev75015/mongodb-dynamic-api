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
import { BaseUpdateManyService } from './base-update-many.service';
import { UpdateManyControllerConstructor } from './update-many-controller.interface';
import { UpdateManyControllerMixin } from './update-many-controller.mixin';
import { UpdateManyService } from './update-many-service.interface';

function createUpdateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class UpdateManyService extends BaseUpdateManyService<Entity> {
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

  Object.defineProperty(UpdateManyService, 'name', {
    value: provideName('UpdateMany', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('UpdateMany', entity.name, version, 'Service'),
    useClass: UpdateManyService,
  };
}

function createUpdateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): UpdateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class UpdateManyController extends UpdateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('UpdateMany', entity.name, version, 'Service'))
      protected readonly service: UpdateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(UpdateManyController, 'name', {
    value: `${provideName('UpdateMany', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return UpdateManyController;
}

export { createUpdateManyController, createUpdateManyServiceProvider };
