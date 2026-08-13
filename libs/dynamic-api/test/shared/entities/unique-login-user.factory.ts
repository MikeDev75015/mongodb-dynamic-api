import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity, IsUnique } from '../../../src';

/**
 * Factory returning a new UniqueLoginUserEntity class each call to avoid Mongoose model conflicts.
 * Same shape as `createLoginUserEntity`, except `username` also carries `@IsUnique` — reproduces
 * the auth mixins' login DTO scenario, where the login field's own uniqueness check must not be
 * re-run against the account that is currently logging in.
 * Usage: const User = createUniqueLoginUserEntity(); type User = InstanceType<typeof User>;
 * Shape: username (required, @IsUnique), pass (required), role (default 'user'), isVerified (default false)
 */
export function createUniqueLoginUserEntity() {
  @Schema({ collection: 'users' })
  class UniqueLoginUserEntity extends BaseEntity {
    @IsUnique(UniqueLoginUserEntity, { field: 'username' })
    @Prop({ type: String, required: true })
    username: string;

    @Prop({ type: String, required: true })
    pass: string;

    @Prop({ type: String, default: 'user' })
    role: 'admin' | 'user' | 'client';

    @Prop({ type: Boolean, default: false })
    isVerified: boolean;
  }

  return UniqueLoginUserEntity;
}

export type UniqueLoginUserEntityType = InstanceType<ReturnType<typeof createUniqueLoginUserEntity>>;
