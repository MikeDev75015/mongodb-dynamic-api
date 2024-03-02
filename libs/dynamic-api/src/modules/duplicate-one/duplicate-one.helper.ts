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
import { DTOsBundle, ServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseDuplicateOneService } from './base-duplicate-one.service';
import { DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneControllerMixin } from './duplicate-one-controller.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

function provideServiceName(entityName) {
  return `DuplicateOne${entityName}Service`;
}

function createDuplicateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
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
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: DuplicateOneService,
  };
}

function createDuplicateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): DuplicateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class DuplicateOneController extends DuplicateOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: DuplicateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DuplicateOneController, 'name', {
    value: `DuplicateOne${entity.name}Controller`,
    writable: false,
  });

  return DuplicateOneController;
}

export { createDuplicateOneController, createDuplicateOneServiceProvider };
