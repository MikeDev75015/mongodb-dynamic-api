import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { BaseEntity, DynamicApiForFeatureOptions, DynamicApiSchema, DynamicApiSchemaOptions, SoftDeletableEntity } from '../src';

type DynamicApiForFeatureOptionsMock = DynamicApiForFeatureOptions<any>;

function buildDynamicApiModuleOptionsMock(
  {
    entity,
    controllerOptions,
    routes,
    webSocket,
    extraImports,
    extraProviders,
    extraControllers,
    customRoutes,
  }: Partial<DynamicApiForFeatureOptions<any>> = {},
  { indexes, hooks, customInit }: Partial<DynamicApiSchemaOptions> = {},
  softDeletable = false,
): DynamicApiForFeatureOptionsMock {
  // @ts-ignore
  @DynamicApiSchema({ indexes, hooks, customInit })
  class PersonEntity extends (
    softDeletable
      ? BaseEntity
      : SoftDeletableEntity
  ) {
    // @ts-ignore
    @ApiProperty()
    // @ts-ignore
    @IsNotEmpty()
    // @ts-ignore
    @IsString()
    name: string;

    // @ts-ignore
    @ApiPropertyOptional()
    // @ts-ignore
    @IsPositive()
    // @ts-ignore
    @IsInt()
    // @ts-ignore
    @IsOptional()
    age?: number;
  }

  return {
    entity: entity ?? PersonEntity,
    controllerOptions: {
      path: 'persons',
      ...controllerOptions,
    },
    routes,
    webSocket,
    extraImports,
    extraProviders,
    extraControllers,
    customRoutes,
  };
}

export { buildDynamicApiModuleOptionsMock };
