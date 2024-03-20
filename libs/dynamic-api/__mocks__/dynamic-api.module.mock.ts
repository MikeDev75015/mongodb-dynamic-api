import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import {
  BaseEntity,
  DynamicApiForFeatureOptions,
  DynamicAPISchemaOptions,
  DynamicAPISchemaOptionsInterface,
  SoftDeletableEntity,
} from '../src';

type DynamicApiForFeatureOptionsMock = DynamicApiForFeatureOptions<any> & { fakeSchema: MongooseSchema<any> };

function buildDynamicApiModuleOptionsMock(
  { entity, controllerOptions, routes }: Partial<DynamicApiForFeatureOptions<any>> = {},
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

  const fakeSchema = SchemaFactory.createForClass(entity ?? PersonEntity);
  fakeSchema.set = jest.fn();
  fakeSchema.index = jest.fn();
  fakeSchema.path = jest.fn();
  fakeSchema.post = jest.fn();
  fakeSchema.pre = jest.fn();

  return {
    fakeSchema,
    entity: entity ?? PersonEntity,
    controllerOptions: {
      path: 'persons',
      ...controllerOptions,
    },
    routes,
  };
}

export { buildDynamicApiModuleOptionsMock };
