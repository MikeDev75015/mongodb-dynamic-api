import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new RegisterUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createRegisterUserEntity(); type User = InstanceType<typeof User>;
 * Shape: email (required), password (required), role (default 'user'), isVerified (default false)
 */
export function createRegisterUserEntity() {
  @Schema({ collection: 'users' })
  class RegisterUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: 'user' })
    role: 'admin' | 'user' | 'client';

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;
  }

  return RegisterUserEntity;
}

export type RegisterUserEntityType = InstanceType<ReturnType<typeof createRegisterUserEntity>>;

