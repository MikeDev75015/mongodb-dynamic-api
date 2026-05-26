import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'otp_codes',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class OtpCode extends Document {
  /** Value of the loginField for the requesting user (e.g. email address). */
  @Prop({ type: String, required: true, index: true })
  identifier: string;

  /** Bcrypt-hashed 6-digit OTP. */
  @Prop({ type: String, required: true })
  hashedCode: string;

  /**
   * MongoDB TTL index — the document is automatically removed
   * when `expiresAt` is reached (expireAfterSeconds: 0).
   */
  @Prop({ type: Date, required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);

