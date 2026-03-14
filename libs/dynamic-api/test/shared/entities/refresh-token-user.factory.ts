import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a UserEntity with a refreshTokenHash field for server-side rotation tests.
 */
export function createUserWithRefreshTokenEntity() {
  @Schema({ collection: 'users' })
  class UserWithRefreshTokenEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, default: null })
    refreshTokenHash: string;
  }

  return UserWithRefreshTokenEntity;
}

export type UserWithRefreshTokenEntityType = InstanceType<ReturnType<typeof createUserWithRefreshTokenEntity>>;

