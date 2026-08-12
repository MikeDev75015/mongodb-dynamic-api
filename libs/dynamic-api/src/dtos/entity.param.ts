import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from '../models';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export class EntityParam implements Pick<BaseEntity, 'id'> {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id = '';
}
