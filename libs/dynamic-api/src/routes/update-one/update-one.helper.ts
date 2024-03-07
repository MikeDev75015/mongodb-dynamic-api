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
import { ControllerOptions, DTOsBundle, DynamicAPIRouteConfig, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseUpdateOneService } from './base-update-one.service';
import { UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneControllerMixin } from './update-one-controller.mixin';
import { UpdateOneService } from './update-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `UpdateOne${entityName}${addVersionSuffix(version)}Service`;
}

function createUpdateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class UpdateOneService extends BaseUpdateOneService<Entity> {
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

  Object.defineProperty(UpdateOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: UpdateOneService,
  };
}

function createUpdateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): UpdateOneControllerConstructor<Entity> {
  const { path, apiTag, abilityPredicates } = controllerOptions;
  const { type: routeType, description, dTOs, abilityPredicate } = routeConfig;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class UpdateOneController extends UpdateOneControllerMixin(
    entity,
    { path, apiTag, abilityPredicates },
    { type: routeType, description, dTOs, abilityPredicate },
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: UpdateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(UpdateOneController, 'name', {
    value: `UpdateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return UpdateOneController;
}

export { createUpdateOneController, createUpdateOneServiceProvider };
