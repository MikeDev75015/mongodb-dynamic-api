import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';

export class ManyEntityQuery {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
