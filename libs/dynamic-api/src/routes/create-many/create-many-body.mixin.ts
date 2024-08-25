import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { EntityBodyMixin } from '../../mixins';
import { BaseEntity } from '../../models';

function CreateManyBodyMixin<Entity extends BaseEntity>(entity: Type<Entity>, CreateManyCustomBody?: Type) {
  class ToCreate extends EntityBodyMixin(entity) {}

  class CreateManyDefaultDto {
    @ApiProperty({ type: [ToCreate] })
    @ValidateNested({ each: true })
    @IsInstance(ToCreate, { each: true })
    @ArrayMinSize(1)
    @Transform(({ value }) => value?.map((e: object) => plainToInstance(ToCreate, e)))
    list: ToCreate[];
  }

  class CreateManyDto extends (
    CreateManyCustomBody ?? CreateManyDefaultDto
  ) {}

  return CreateManyDto;
}

export { CreateManyBodyMixin };
