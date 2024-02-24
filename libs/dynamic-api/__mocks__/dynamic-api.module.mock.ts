import {
  BaseEntity,
  DynamicApiOptions,
  DynamicAPISchemaOptions,
  DynamicAPISchemaOptionsInterface,
  SoftDeletableEntity,
} from '@dynamic-api';
import { Schema } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

function buildDynamicApiModuleOptionsMock(
  { entity, controllerOptions, routes }: Partial<DynamicApiOptions<any>> = {},
  { indexes, hooks }: Partial<DynamicAPISchemaOptionsInterface> = {},
  softDeletable = false,
): DynamicApiOptions<any> {
  @DynamicAPISchemaOptions({
    indexes,
    hooks,
  })
  @Schema()
  class PersonEntity extends (softDeletable
    ? BaseEntity
    : SoftDeletableEntity) {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsPositive()
    @IsInt()
    @IsOptional()
    age?: number;
  }

  return {
    entity: entity ?? PersonEntity,
    controllerOptions: {
      path: 'persons',
      ...controllerOptions,
    },
    routes: routes ?? [],
  };
}

export { buildDynamicApiModuleOptionsMock };
