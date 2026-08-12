import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export class ManyEntityQuery {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
