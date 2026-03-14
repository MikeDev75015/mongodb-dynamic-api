import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new LoginUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createLoginUserEntity(); type User = InstanceType<typeof User>;
 * Shape: username (required), pass (required), role (default 'user'), isVerified (default false)
 */
export function createLoginUserEntity() {
  @Schema({ collection: 'users' })
  class LoginUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    username: string;

    @Prop({ type: String, required: true })
    pass: string;

    @Prop({ type: String, default: 'user' })
    role: 'admin' | 'user' | 'client';

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;
  }

  return LoginUserEntity;
}

export type LoginUserEntityType = InstanceType<ReturnType<typeof createLoginUserEntity>>;

