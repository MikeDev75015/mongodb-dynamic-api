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
import { DTOsBundle, DynamicAPIServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateOneService } from './base-create-one.service';
import { CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneService } from './create-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `CreateOne${entityName}${addVersionSuffix(version)}Service`;
}

function createCreateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): DynamicAPIServiceProvider {
  class CreateOneService extends BaseCreateOneService<Entity> {
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

  Object.defineProperty(CreateOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: CreateOneService,
  };
}

function createCreateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): CreateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class CreateOneController extends CreateOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: CreateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateOneController, 'name', {
    value: `CreateOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return CreateOneController;
}

export { createCreateOneController, createCreateOneServiceProvider };
