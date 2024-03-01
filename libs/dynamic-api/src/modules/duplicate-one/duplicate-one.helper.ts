
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
import { BaseDuplicateOneService } from './base-duplicate-one.service';
import { DuplicateOneControllerConstructor } from './duplicate-one-controller.interface';
import { DuplicateOneControllerMixin } from './duplicate-one-controller.mixin';
import { DuplicateOneService } from './duplicate-one-service.interface';

function provideServiceName(entityName) {
  return `DuplicateOne${entityName}Service`;
}

function createDuplicateOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
): ServiceProvider {
  class DuplicateOneService extends BaseDuplicateOneService<Entity> {
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

  Object.defineProperty(DuplicateOneService, 'name', {
    value: provideServiceName(entity.name),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name),
    useClass: DuplicateOneService,
  };
}

function createDuplicateOneController<Entity extends BaseEntity>(
  entity: Type<Entity>,
  path: string,
  apiTag?: string,
  version?: string,
  description?: string,
  DTOs?: DTOsBundle,
): DuplicateOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  class DuplicateOneController extends DuplicateOneControllerMixin(
    entity,
    path,
    apiTag,
    version,
    description,
    DTOs,
  ) {
    constructor(
      @Inject(provideServiceName(entity.name))
      protected readonly service: DuplicateOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(DuplicateOneController, 'name', {
    value: `DuplicateOne${entity.name}Controller`,
    writable: false,
  });

  return DuplicateOneController;
}

export { createDuplicateOneController, createDuplicateOneServiceProvider };
