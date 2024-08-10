import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type as TypeTransformer } from 'class-transformer';
import { ArrayMinSize, IsInstance, ValidateNested } from 'class-validator';
import { CreateManyBody } from './create-many-controller.interface';

function CreateManyBodyDtoMixin<DtoBodyType>(DtoBody: Type<DtoBodyType>) {
  class CreateManyBodyDto implements CreateManyBody<DtoBodyType> {
    @ApiProperty({ type: [DtoBody] })
    @ValidateNested({ each: true })
    @IsInstance(DtoBody, { each: true })
    @ArrayMinSize(1)
    @TypeTransformer(() => DtoBody)
    list: DtoBodyType[];
  }

  return CreateManyBodyDto;
}

export { CreateManyBodyDtoMixin };
