import { BaseEntity, DTOsBundle } from '@dynamic-api';
import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  createCreateOneController,
  createCreateOneServiceProvider,
} from './create-one.helper';

@Module({})
export class CreateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createCreateOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createCreateOneServiceProvider(entity);

    return {
      module: CreateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
