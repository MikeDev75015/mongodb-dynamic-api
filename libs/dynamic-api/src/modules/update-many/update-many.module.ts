import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, RouteConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import {
  createUpdateManyController,
  createUpdateManyServiceProvider,
} from './update-many.helper';

@Module({})
export class UpdateManyModule {
  static forFeature<Entity extends BaseEntity>(
    databaseModule: DynamicModule,
    entity: Type<Entity>,
    { path, apiTag }: ControllerOptions,
    { description, dTOs: DTOs }: RouteConfig<Entity>,
    version?: string,
    validationPipeOptions?: ValidationPipeOptions,
  ): DynamicModule {
    const controller = createUpdateManyController(
      entity,
      path,
      apiTag,
      version,
      description,
      DTOs,
      validationPipeOptions,
    );
    const ServiceProvider = createUpdateManyServiceProvider(entity, version);

    return {
      module: UpdateManyModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
