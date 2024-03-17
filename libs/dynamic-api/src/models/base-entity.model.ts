import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ObjectId } from 'mongoose';

export abstract class BaseEntity {
  @Exclude()
  _id: ObjectId;

  @Exclude()
  __v: number;

  @ApiProperty()
  id: string;

  @ApiProperty()
  @Prop({ type: Date })
  createdAt: Date;

  @ApiProperty()
  @Prop({ type: Date })
  updatedAt: Date;
}
