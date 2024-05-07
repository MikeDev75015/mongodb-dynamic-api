import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base-entity.model';

export abstract class SoftDeletableEntity extends BaseEntity {
  @Exclude()
  @Prop({ type: Boolean, default: false })
  isDeleted = false;

  @ApiProperty({ type: Date, nullable: true })
  @Prop({ type: Date, nullable: true, default: null })
  deletedAt: Date | null = null;
}
