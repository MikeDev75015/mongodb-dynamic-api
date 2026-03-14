import { Prop, Schema } from '@nestjs/mongoose';
import { IsEmail, IsStrongPassword } from 'class-validator';
import { BaseEntity } from '../../../src';

/**
 * Factory returning a new ValidatedUserEntity class each call to avoid Mongoose model conflicts.
 * Usage: const User = createValidatedUserEntity();
 * Shape: email (required, @IsEmail), password (required, @IsStrongPassword)
 */
export function createValidatedUserEntity() {
  @Schema({ collection: 'users' })
  class ValidatedUserEntity extends BaseEntity {
    @Prop({ type: String, required: true })
    @IsEmail()
    email: string;

    @Prop({ type: String, required: true })
    @IsStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    password: string;
  }

  return ValidatedUserEntity;
}

export type ValidatedUserEntityType = InstanceType<ReturnType<typeof createValidatedUserEntity>>;

