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
import { BaseDeleteOneService } from './base-delete-one.service';
import { DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneControllerMixin } from './delete-one-controller.mixin';
import { DeleteOneService } from './delete-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `DeleteOne${entityName}${addVersionSuffix(version)}Service`;
}

function createDeleteOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class DeleteOneService extends BaseDeleteOneService<Entity> {
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

  Object.defineProperty(DeleteOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: DeleteOneService,
  };
}

function createDeleteOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteOneControllerConstructor<Entity> {
  const { path, apiTag } = controllerOptions;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions),
  )
  @UseInterceptors(ClassSerializerInterceptor)
  class DeleteOneController extends DeleteOneControllerMixin(
    entity,
    controllerOptions,
    routeConfig,
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: DeleteOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DeleteOneController, 'name', {
    value: `DeleteOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return DeleteOneController;
}

export { createDeleteOneController, createDeleteOneServiceProvider };
