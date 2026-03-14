import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new BroadcastUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createBroadcastUserEntity();
 * Shape: email (required), password (required), name (optional)
 */
export function createBroadcastUserEntity() {
  @Schema({ collection: 'users' })
  class BroadcastUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String })
    name?: string;
  }

  return BroadcastUserEntity;
}

export type BroadcastUserEntityType = InstanceType<ReturnType<typeof createBroadcastUserEntity>>;

