import { Schema } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { BaseEntity, DynamicApiForFeatureOptions, DynamicAPISchemaOptions, DynamicAPISchemaOptionsInterface, SoftDeletableEntity } from '../src';

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
  }: Partial<DynamicApiForFeatureOptions<any>> = {},
  { indexes, hooks, customInit }: Partial<DynamicAPISchemaOptionsInterface> = {},
  softDeletable = false,
): DynamicApiForFeatureOptionsMock {
  // @ts-ignore
  @DynamicAPISchemaOptions({ indexes, hooks, customInit })
  // @ts-ignore
  @Schema()
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
  };
}

export { buildDynamicApiModuleOptionsMock };
