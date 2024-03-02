import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DTOsBundle } from '../../interfaces';
import { BaseEntity } from '../../models';
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
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createGetOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
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
