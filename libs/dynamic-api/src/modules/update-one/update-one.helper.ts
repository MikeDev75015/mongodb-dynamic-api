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
import { BaseUpdateOneService } from './base-update-one.service';
import { UpdateOneControllerConstructor } from './update-one-controller.interface';
import { UpdateOneControllerMixin } from './update-one-controller.mixin';
import { UpdateOneService } from './update-one-service.interface';

function provideServiceName(entityName) {
  return `UpdateOne${entityName}Service`;
}

function createUpdateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
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
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: UpdateOneService,
  };
}

function createUpdateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): UpdateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class UpdateOneController extends UpdateOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: UpdateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(UpdateOneController, 'name', {
    value: `UpdateOne${entity.name}Controller`,
    writable: false,
  });

  return UpdateOneController;
}

export { createUpdateOneController, createUpdateOneServiceProvider };
