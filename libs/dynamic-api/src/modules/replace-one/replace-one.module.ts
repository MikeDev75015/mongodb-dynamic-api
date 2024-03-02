import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { DTOsBundle } from '../../interfaces';
import { BaseEntity } from '../../models';
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
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createReplaceOneController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
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
