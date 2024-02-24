import { BaseEntity, DTOsBundle } from "@dynamic-api";
import { DynamicModule, Module, Type } from '@nestjs/common';
import {
  createGetOneController,
  createGetOneServiceProvider,
} from './get-one.helper';

@Module({})
export class GetOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createGetOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createGetOneServiceProvider(entity);

    return {
      module: GetOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
