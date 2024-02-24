import {
  BaseEntity,
  DEFAULT_BDD_CONNECTION_NAME,
  DTOsBundle,
  ServiceProvider,
} from '@dynamic-api';
import {
  BaseGetOneService,
  GetOneControllerConstructor,
  GetOneControllerMixin,
  GetOneService,
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
  return `GetOne${entityName}Service`;
}

function createGetOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class GetOneService extends BaseGetOneService<Entity> {
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

  Object.defineProperty(GetOneService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: GetOneService,
  };
}

function createGetOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): GetOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  class GetOneController extends GetOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: GetOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetOneController, 'name', {
    value: `GetOne${entity.name}Controller`,
    writable: false,
  });

  return GetOneController;
}

export { createGetOneController, createGetOneServiceProvider };
