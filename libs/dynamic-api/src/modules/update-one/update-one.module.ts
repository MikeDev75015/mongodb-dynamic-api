import { DynamicModule, Module, Type } from '@nestjs/common';
import { DTOsBundle } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createUpdateOneController,
  createUpdateOneServiceProvider,
} from './update-one.helper';

@Module({})
export class UpdateOneModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    path: string,
    apiTag?: string,
    version?: string,
    description?: string,
    DTOs?: DTOsBundle,
  ): DynamicModule {
    const controller = createUpdateOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
    );
    const ServiceProvider = createUpdateOneServiceProvider(entity);

    return {
      module: UpdateOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
