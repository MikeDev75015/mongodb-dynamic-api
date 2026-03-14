import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new BasicUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createBasicUserEntity();
 * Shape: email (required), password (required)
 */
export function createBasicUserEntity() {
  @Schema({ collection: 'users' })
  class BasicUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;
  }

  return BasicUserEntity;
}

export type BasicUserEntityType = InstanceType<ReturnType<typeof createBasicUserEntity>>;

