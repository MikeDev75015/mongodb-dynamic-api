import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, RouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createDeleteManyController,
  createDeleteManyServiceProvider,
} from './delete-many.helper';

@Module({})
export class DeleteManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    { path, apiTag }: ControllerOptions,
    { description, dTOs: DTOs }: RouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createDeleteManyController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
    );
    const ServiceProvider = createDeleteManyServiceProvider(entity, version);

    return {
      module: DeleteManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
