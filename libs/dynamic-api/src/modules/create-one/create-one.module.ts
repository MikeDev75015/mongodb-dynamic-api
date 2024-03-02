import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DTOsBundle } from '../../interfaces';
import { BaseEntity } from '../../models';
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
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createCreateOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
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
