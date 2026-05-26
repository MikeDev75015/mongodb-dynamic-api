import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User identifier (e.g. email address).' })
  identifier: string;
}

