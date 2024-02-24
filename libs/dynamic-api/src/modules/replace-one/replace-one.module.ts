import { BaseEntity, DTOsBundle } from '@dynamic-api';
import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  createReplaceOneController,
  createReplaceOneServiceProvider,
} from './replace-one.helper';

@Module({})
export class ReplaceOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createReplaceOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createReplaceOneServiceProvider(entity);

    return {
      module: ReplaceOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
