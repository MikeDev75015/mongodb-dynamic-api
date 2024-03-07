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
import { BaseDuplicateOneService } from './base-duplicate-one.service';
import { DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneControllerMixin } from './duplicate-one-controller.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `DuplicateOne${entityName}${addVersionSuffix(version)}Service`;
}

function createDuplicateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class DuplicateOneService extends BaseDuplicateOneService<Entity> {
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

  Object.defineProperty(DuplicateOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: DuplicateOneService,
  };
}

function createDuplicateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): DuplicateOneControllerConstructor<Entity> {
  const { path, apiTag, abilityPredicates } = controllerOptions;
  const { type: routeType, description, dTOs, abilityPredicate } = routeConfig;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class DuplicateOneController extends DuplicateOneControllerMixin(
    entity,
    { path, apiTag, abilityPredicates },
    { type: routeType, description, dTOs, abilityPredicate },
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: DuplicateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DuplicateOneController, 'name', {
    value: `DuplicateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return DuplicateOneController;
}

export { createDuplicateOneController, createDuplicateOneServiceProvider };
