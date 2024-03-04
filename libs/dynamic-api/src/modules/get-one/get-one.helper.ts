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
import { BaseGetOneService } from './base-get-one.service';
import { GetOneControllerConstructor } from './get-one-controller.interface';
import { GetOneControllerMixin } from './get-one-controller.mixin';
import { GetOneService } from './get-one-service.interface';

function provideServiceName(entityName, version: string | undefined) {
  return `GetOne${entityName}${addVersionSuffix(version)}Service`;
}

function createGetOneServiceProvider<Entity extends BaseEntity>(
  entity: Type<Entity>,
  version: string | undefined,
): ServiceProvider {
  class GetOneService extends BaseGetOneService<Entity> {
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

  Object.defineProperty(GetOneService, 'name', {
    value: provideServiceName(entity.name, version),
    writable: false,
  });

  return {
    provide: provideServiceName(entity.name, version),
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
  validationPipeOptions?: ValidationPipeOptions,
): GetOneControllerConstructor<Entity> {
  @Controller({ path, version })
  @ApiTags(apiTag || entity.name)
  @UsePipes(
    new ValidationPipe(validationPipeOptions ?? { transform: true }),
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
      @Inject(provideServiceName(entity.name, version))
      protected readonly service: GetOneService<Entity>,
    ) {
      super(service);
    }
  }

  Object.defineProperty(GetOneController, 'name', {
    value: `GetOne${entity.name}${addVersionSuffix(version)}Controller`,
    writable: false,
  });

  return GetOneController;
}

export { createGetOneController, createGetOneServiceProvider };
