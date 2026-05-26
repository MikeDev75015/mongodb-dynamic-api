import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User identifier (e.g. email address).' })
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @ApiProperty({ description: '6-digit one-time code sent to the user.' })
  code: string;
}

