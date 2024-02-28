import { BaseEntity, DTOsBundle } from '@dynamic-api';
import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  createCreateManyController,
  createCreateManyServiceProvider,
} from './create-many.helper';

@Module({})
export class CreateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createCreateManyController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createCreateManyServiceProvider(entity);

    return {
      module: CreateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
