import {
  Controller,
  Inject,
  Type,
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
import { BaseDeleteManyService } from './base-delete-many.service';
import { DeleteManyControllerConstructor } from './delete-many-controller.interface';
import { DeleteManyControllerMixin } from './delete-many-controller.mixin';
import { DeleteManyService } from './delete-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `DeleteMany${entityName}${addVersionSuffix(version)}Service`;
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
        DynamicApiModule.connectionName,
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
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteManyControllerConstructor<Entity> {
  const { path, apiTag, abilityPredicates } = controllerOptions;
  const { type: routeType, description, dTOs, abilityPredicate } = routeConfig;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class DeleteManyController extends DeleteManyControllerMixin(
    entity,
    { path, apiTag, abilityPredicates },
    { type: routeType, description, dTOs, abilityPredicate },
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
    value: `DeleteMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return DeleteManyController;
}

export { createDeleteManyController, createDeleteManyServiceProvider };
