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
import { BaseReplaceOneService } from './base-replace-one.service';
import { ReplaceOneControllerConstructor } from './replace-one-controller.interface';
import { ReplaceOneControllerMixin } from './replace-one-controller.mixin';
import { ReplaceOneService } from './replace-one-service.interface';

function provideServiceName(entityName) {
  return `ReplaceOne${entityName}Service`;
}

function createReplaceOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
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
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: ReplaceOneService,
  };
}

function createReplaceOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
  validationPipeOptions?: ValidationPipeOptions,
): ReplaceOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
  )
  class ReplaceOneController extends ReplaceOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: ReplaceOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(ReplaceOneController, 'name', {
    value: `ReplaceOne${entity.name}Controller`,
    writable: false,
  });

  return ReplaceOneController;
}

export { createReplaceOneController, createReplaceOneServiceProvider };
