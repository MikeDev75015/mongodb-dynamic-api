import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from '../models';

/** @internal Not part of the public API. */
export class EntityParam implements Pick<BaseEntity, 'id'> {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id = '';
}
