import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new UpdatePasswordUserEntity class each call to avoid Mongoose model conflicts.
 * Used by the `PATCH /auth/account/password` and `password.minLength` e2e tests.
 * Usage: const User = createUpdatePasswordUserEntity(); type User = InstanceType<typeof User>;
 * Shape: email (required), password (required), refreshTokenHash (default null), isVerified (default false)
 */
export function createUpdatePasswordUserEntity() {
  @Schema({ collection: 'users' })
  class UpdatePasswordUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: null })
    refreshTokenHash: string;

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;
  }

  return UpdatePasswordUserEntity;
}

export type UpdatePasswordUserEntityType = InstanceType<ReturnType<typeof createUpdatePasswordUserEntity>>;
