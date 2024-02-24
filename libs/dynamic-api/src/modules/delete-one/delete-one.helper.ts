import {
  BaseEntity,
  DEFAULT_BDD_CONNECTION_NAME,
  DTOsBundle,
  ServiceProvider,
} from '@dynamic-api';
import {
  BaseDeleteOneService,
  DeleteOneControllerConstructor,
  DeleteOneControllerMixin,
  DeleteOneService,
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
        process.env.BBD_CONNECTION_NAME || DEFAULT_BDD_CONNECTION_NAME,
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
): DeleteOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
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
