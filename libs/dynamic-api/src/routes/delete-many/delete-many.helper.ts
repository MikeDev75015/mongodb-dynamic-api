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
import { getNamePrefix } from '../../helpers';
import { DynamicApiControllerOptions, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDeleteManyService } from './base-delete-many.service';
import { DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyControllerMixin } from './delete-many-controller.mixin';
import { DeleteManyService } from './delete-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `${getNamePrefix('DeleteMany', entityName, version)}Service`;
}

function createDeleteManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
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
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: DeleteManyService,
  };
}

function createDeleteManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: DynamicApiControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteManyControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @ValidatorPipe(validationPipeOptions)
  @UseInterceptors(ClassSerializerInterceptor)
  class DeleteManyController extends DeleteManyControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: DeleteManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DeleteManyController, 'name', {
    value: `${getNamePrefix('DeleteMany', entity.name, version)}Controller`,
    writable: false,
  });

  return DeleteManyController;
}

export { createDeleteManyController, createDeleteManyServiceProvider };
