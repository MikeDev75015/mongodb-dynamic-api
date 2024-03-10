import {
  ClassSerializerInterceptor,
  Controller,
  Inject,
  Type, UseInterceptors,
  UsePipes,
  ValidationPipe, ValidationPipeOptions,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { DynamicApiModule } from '../../dynamic-api.module';
import { addVersionSuffix } from '../../helpers';
import { ControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateManyService } from './base-update-many.service';
import { UpdateManyControllerConstructor } from './update-many-controller.interface';
import { UpdateManyControllerMixin } from './update-many-controller.mixin';
import { UpdateManyService } from './update-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `UpdateMany${entityName}${addVersionSuffix(version)}Service`;
}

function createUpdateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class UpdateManyService extends BaseUpdateManyService<Entity> {
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

  Object.defineProperty(UpdateManyService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: UpdateManyService,
  };
}

function createUpdateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): UpdateManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions),
  )
  @UseInterceptors(ClassSerializerInterceptor)
  class UpdateManyController extends UpdateManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: UpdateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(UpdateManyController, 'name', {
    value: `UpdateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return UpdateManyController;
}

export { createUpdateManyController, createUpdateManyServiceProvider };
