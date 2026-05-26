import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new PasswordlessUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createPasswordlessUserEntity(); type User = InstanceType<typeof User>;
 * Shape: email (required), password (optional for passwordless-only users)
 */
export function createPasswordlessUserEntity() {
  @Schema({ collection: 'users' })
  class PasswordlessUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String })
    password?: string;
  }

  return PasswordlessUserEntity;
}

export type PasswordlessUserEntityType = InstanceType<ReturnType<typeof createPasswordlessUserEntity>>;

