import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new ResetPasswordUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createResetPasswordUserEntity(); type User = InstanceType<typeof User>;
 * Shape: email (required), password (required), isVerified (default false), resetPasswordToken (optional)
 */
export function createResetPasswordUserEntity() {
  @Schema({ collection: 'users' })
  class ResetPasswordUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;

    @Prop({ type: String })
    resetPasswordToken: string;
  }

  return ResetPasswordUserEntity;
}

export type ResetPasswordUserEntityType = InstanceType<ReturnType<typeof createResetPasswordUserEntity>>;

