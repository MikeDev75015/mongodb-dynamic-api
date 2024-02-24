import {
  BaseEntity,
  DEFAULT_BDD_CONNECTION_NAME,
  DTOsBundle,
  ServiceProvider,
} from '@dynamic-api';
import {
  BaseGetManyService,
  GetManyControllerConstructor,
  GetManyControllerMixin,
  GetManyService,
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
  return `GetMany${entityName}Service`;
}

function createGetManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class GetManyService extends BaseGetManyService<Entity> {
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

  Object.defineProperty(GetManyService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: GetManyService,
  };
}

function createGetManyController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): GetManyControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  class GetManyController extends GetManyControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: GetManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetManyController, 'name', {
    value: `GetMany${entity.name}Controller`,
    writable: false,
  });

  return GetManyController;
}

export { createGetManyController, createGetManyServiceProvider };
