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
import { BaseReplaceOneService } from './base-replace-one.service';
import { ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneControllerMixin } from './replace-one-controller.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `ReplaceOne${entityName}${addVersionSuffix(version)}Service`;
}

function createReplaceOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class ReplaceOneService extends BaseReplaceOneService<Entity> {
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

  Object.defineProperty(ReplaceOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: ReplaceOneService,
  };
}

function createReplaceOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  controllerOptions: ControllerOptions<Entity>,
  routeConfig: DynamicAPIRouteConfig<Entity>,
  version?: string,
  validationPipeOptions?: ValidationPipeOptions,
): ReplaceOneControllerConstructor<Entity> {
  const { path, apiTag, abilityPredicates } = controllerOptions;
  const { type: routeType, description, dTOs, abilityPredicate } = routeConfig;

  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class ReplaceOneController extends ReplaceOneControllerMixin(
    entity,
    { path, apiTag, abilityPredicates },
    { type: routeType, description, dTOs, abilityPredicate },
    version,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: ReplaceOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(ReplaceOneController, 'name', {
    value: `ReplaceOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return ReplaceOneController;
}

export { createReplaceOneController, createReplaceOneServiceProvider };
