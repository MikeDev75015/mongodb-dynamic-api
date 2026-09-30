import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';
import { toIdList } from '../helpers/id-list.helper';

/** @internal Not part of the public API. */
export class ManyEntityQuery {
  @ApiProperty({ type: [String], minItems: 1 })
  // `?ids=a` arrives as the string 'a': wrap it so a single id passes `ArrayMinSize(1)`.
  @Transform(({ value }) => toIdList(value))
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
