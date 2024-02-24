import { BaseEntity, DTOsBundle } from '@dynamic-api';
import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  createDuplicateOneController,
  createDuplicateOneServiceProvider,
} from '@dynamic-api/modules';

@Module({})
export class DuplicateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createDuplicateOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createDuplicateOneServiceProvider(entity);

    return {
      module: DuplicateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
