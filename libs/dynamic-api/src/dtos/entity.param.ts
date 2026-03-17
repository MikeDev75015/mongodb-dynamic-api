import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from '../models';

/** @deprecated Internal API — will be removed from public exports in v5. */
export class EntityParam implements Pick<BaseEntity, 'id'> {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id = '';
}
