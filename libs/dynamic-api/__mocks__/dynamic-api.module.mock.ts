import { Schema } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import {
  BaseEntity,
  DynamicApiForFeatureOptions,
  DynamicAPISchemaOptions,
  DynamicAPISchemaOptionsInterface,
  SoftDeletableEntity,
} from '../src';

function buildDynamicApiModuleOptionsMock(
  { entity, controllerOptions, routes }: Partial<DynamicApiForFeatureOptions<any>> = {},
  { indexes, hooks }: Partial<DynamicAPISchemaOptionsInterface> = {},
  softDeletable = false,
): DynamicApiForFeatureOptions<any> {
  // @ts-ignore
  @DynamicAPISchemaOptions({ indexes, hooks })
  // @ts-ignore
  @Schema()
  class PersonEntity extends (softDeletable
    ? BaseEntity
    : SoftDeletableEntity) {
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
  };
}

export { buildDynamicApiModuleOptionsMock };
