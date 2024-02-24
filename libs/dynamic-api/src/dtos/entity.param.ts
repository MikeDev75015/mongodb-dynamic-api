import { BaseEntity } from '@dynamic-api';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EntityParam implements Pick<BaseEntity, 'id'> {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id = '';
}
