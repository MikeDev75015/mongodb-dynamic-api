import {
  BaseEntity,
  DEFAULT_BDD_CONNECTION_NAME,
  DTOsBundle,
  ServiceProvider,
} from '@dynamic-api';
import {
  BaseUpdateOneService,
  UpdateOneControllerConstructor,
  UpdateOneControllerMixin,
  UpdateOneService,
} from '@dynamic-api/modules';
import {
  Controller,
  Inject,
  Type,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

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
        process.env.BBD_CONNECTION_NAME || DEFAULT_BDD_CONNECTION_NAME,
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
): UpdateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
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
