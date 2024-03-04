import { DynamicModule, Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { ControllerOptions, DynamicAPIRouteConfig } from '../../interfaces';
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
    { path, apiTag }: ControllerOptions,
    { description, dTOs: DTOs }: DynamicAPIRouteConfig<Entity>,
    version?: string,
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
    const ServiceProvider = createGetOneServiceProvider(entity, version);

    return {
      module: GetOneModule,
      imports: [databaseModule],
      controllers: [controller],
      providers: [ServiceProvider],
    };
  }
}
