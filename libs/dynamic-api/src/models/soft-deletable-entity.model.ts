import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base-entity.model';

export abstract class SoftDeletableEntity extends BaseEntity {
  // See BaseEntity's comment: `declare` keeps these uninitialized fields runtime-free under SWC
  // too, matching plain tsc, so plainToInstance() doesn't pick up a spurious `undefined` value.
  @Exclude()
  @Prop({ type: Boolean, default: false })
  declare isDeleted: boolean;

  @ApiProperty({ type: Date, nullable: true })
  @Prop({ type: Date, nullable: true, default: null })
  declare deletedAt: Date | null;
}
