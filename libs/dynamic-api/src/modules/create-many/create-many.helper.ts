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
import { BaseCreateManyService } from './base-create-many.service';
import { CreateManyControllerConstructor } from './create-many-controller.interface';
import { CreateManyControllerMixin } from './create-many-controller.mixin';
import { CreateManyService } from './create-many-service.interface';

function provideServiceName(entityName) {
  return `CreateMany${entityName}Service`;
}

function createCreateManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class CreateManyService extends BaseCreateManyService<Entity> {
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

  Object.defineProperty(CreateManyService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: CreateManyService,
  };
}

function createCreateManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): CreateManyControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class CreateManyController extends CreateManyControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: CreateManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateManyController, 'name', {
    value: `CreateMany${entity.name}Controller`,
    writable: false,
  });

  return CreateManyController;
}

export { createCreateManyController, createCreateManyServiceProvider };
