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
import { BaseDuplicateManyService } from './base-duplicate-many.service';
import { DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyControllerMixin } from './duplicate-many-controller.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

function createDuplicateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
  callback: DynamicApiServiceCallback<Entity> | undefined,
): DynamicAPIServiceProvider {
  class DuplicateManyService extends BaseDuplicateManyService<Entity> {
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

  Object.defineProperty(DuplicateManyService, 'name', {
    value: provideName('DuplicateMany', entity.name, version, 'Service'),
    writable: false,
  });

  return {
    provide: provideName('DuplicateMany', entity.name, version, 'Service'),
    useClass: DuplicateManyService,
  };
}

function createDuplicateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DuplicateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class DuplicateManyController extends DuplicateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideName('DuplicateMany', entity.name, version, 'Service'))
      protected readonly service: DuplicateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DuplicateManyController, 'name', {
    value: `${provideName('DuplicateMany', entity.name, version, 'Controller')}`,
    writable: false,
  });

  return DuplicateManyController;
}

export { createDuplicateManyController, createDuplicateManyServiceProvider };
