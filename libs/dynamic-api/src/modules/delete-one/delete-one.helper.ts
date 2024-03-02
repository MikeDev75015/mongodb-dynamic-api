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
import { BaseDeleteOneService } from './base-delete-one.service';
import { DeleteOneControllerConstructor } from './delete-one-controller.interface';
import { DeleteOneControllerMixin } from './delete-one-controller.mixin';
import { DeleteOneService } from './delete-one-service.interface';

function provideServiceName(entityName) {
  return `DeleteOne${entityName}Service`;
}

function createDeleteOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class DeleteOneService extends BaseDeleteOneService<Entity> {
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

  Object.defineProperty(DeleteOneService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: DeleteOneService,
  };
}

function createDeleteOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): DeleteOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class DeleteOneController extends DeleteOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: DeleteOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DeleteOneController, 'name', {
    value: `DeleteOne${entity.name}Controller`,
    writable: false,
  });

  return DeleteOneController;
}

export { createDeleteOneController, createDeleteOneServiceProvider };
