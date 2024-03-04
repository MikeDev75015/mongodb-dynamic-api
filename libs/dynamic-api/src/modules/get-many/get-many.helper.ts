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
import { addVersionSuffix } from '../../helpers';
import { DTOsBundle, ServiceProvider } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseGetManyService } from './base-get-many.service';
import { GetManyControllerConstructor } from './get-many-controller.interface';
import { GetManyControllerMixin } from './get-many-controller.mixin';
import { GetManyService } from './get-many-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `GetMany${entityName}${addVersionSuffix(version)}Service`;
}

function createGetManyServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): ServiceProvider {
  class GetManyService extends BaseGetManyService<Entity> {
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

  Object.defineProperty(GetManyService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
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
  validationPipeOptions?: ValidationPipeOptions,
): GetManyControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
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
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: GetManyService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetManyController, 'name', {
    value: `GetMany${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return GetManyController;
}

export { createGetManyController, createGetManyServiceProvider };
