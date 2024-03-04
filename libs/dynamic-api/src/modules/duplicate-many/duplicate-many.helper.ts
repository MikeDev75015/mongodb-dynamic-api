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
import { DTOsBundle, ServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateManyService } from './base-duplicate-many.service';
import { DuplicateManyControllerConstructor } from './duplicate-many-controller.interface';
import { DuplicateManyControllerMixin } from './duplicate-many-controller.mixin';
import { DuplicateManyService } from './duplicate-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `DuplicateMany${entityName}${addVersionSuffix(version)}Service`;
}

function createDuplicateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): ServiceProvider {
  class DuplicateManyService extends BaseDuplicateManyService<Entity> {
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

  Object.defineProperty(DuplicateManyService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
    useClass: DuplicateManyService,
  };
}

function createDuplicateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): DuplicateManyControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class DuplicateManyController extends DuplicateManyControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: DuplicateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DuplicateManyController, 'name', {
    value: `DuplicateMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return DuplicateManyController;
}

export { createDuplicateManyController, createDuplicateManyServiceProvider };
