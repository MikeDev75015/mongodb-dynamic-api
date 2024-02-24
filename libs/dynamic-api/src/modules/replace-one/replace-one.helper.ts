import {
  BaseEntity,
  DEFAULT_BDD_CONNECTION_NAME,
  DTOsBundle,
  ServiceProvider,
} from '@dynamic-api';
import {
  BaseReplaceOneService,
  ReplaceOneControllerConstructor,
  ReplaceOneControllerMixin,
  ReplaceOneService,
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
        process.env.BBD_CONNECTION_NAME || DEFAULT_BDD_CONNECTION_NAME,
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
): ReplaceOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
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
