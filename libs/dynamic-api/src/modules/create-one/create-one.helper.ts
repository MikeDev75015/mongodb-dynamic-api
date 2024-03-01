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
import { DEFAULT_BDD_CONNECTION_NAME } from '../../dynamic-api.constant';
import { DTOsBundle, ServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseCreateOneService } from './base-create-one.service';
import { CreateOneControllerConstructor } from './create-one-controller.interface';
import { CreateOneControllerMixin } from './create-one-controller.mixin';
import { CreateOneService } from './create-one-service.interface';

function provideServiceName(entityName) {
  return `CreateOne${entityName}Service`;
}

function createCreateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class CreateOneService extends BaseCreateOneService<Entity> {
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

  Object.defineProperty(CreateOneService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: CreateOneService,
  };
}

function createCreateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): CreateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  class CreateOneController extends CreateOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: CreateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(CreateOneController, 'name', {
    value: `CreateOne${entity.name}Controller`,
    writable: false,
  });

  return CreateOneController;
}

export { createCreateOneController, createCreateOneServiceProvider };
