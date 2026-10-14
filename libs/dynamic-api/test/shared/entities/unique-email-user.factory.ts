import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new UniqueEmailUserEntity class each call to avoid Mongoose model conflicts.
 * `email` carries a MongoDB unique index (not a class-validator check): the duplicate is rejected by
 * the database itself (E11000) — used to check the auth routes turn it into a 409.
 * Usage: const User = createUniqueEmailUserEntity(); type User = InstanceType<typeof User>;
 * Shape: email (required, unique index), password (required), name (optional)
 */
export function createUniqueEmailUserEntity() {
  @Schema({ collection: 'users' })
  class UniqueEmailUserEntity extends BaseEntity {
    @Prop({ type: String, required: true, unique: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String })
    name?: string;
  }

  return UniqueEmailUserEntity;
}

export type UniqueEmailUserEntityType = InstanceType<ReturnType<typeof createUniqueEmailUserEntity>>;
