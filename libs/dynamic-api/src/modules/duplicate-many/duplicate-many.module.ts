import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, RouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { createDuplicateManyController, createDuplicateManyServiceProvider } from './duplicate-many.helper';

@Module({})
export class DuplicateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    { path, apiTag }: ControllerOptions,
    { description, dTOs: DTOs }: RouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createDuplicateManyController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
    );
    const ServiceProvider = createDuplicateManyServiceProvider(entity, version);

    return {
      module: DuplicateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
