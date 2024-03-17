import {
  ClassSerializerInterceptor,
  Controller,
  Inject,
  Type,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { DynamicApiModule } from '../../dynamic-api.module';
import { addVersionSuffix } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateManyService } from './base-create-many.service';
import { CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyService } from './create-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `CreateMany${entityName}${addVersionSuffix(version)}Service`;
}

function createCreateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
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
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
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
  @UsePipes(
    new ValidationPipe(validationPipeOptions),
  )
  @UseInterceptors(ClassSerializerInterceptor)
  class CreateManyController extends CreateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: CreateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateManyController, 'name', {
    value: `CreateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return CreateManyController;
}

export { createCreateManyController, createCreateManyServiceProvider };
