import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  resetPasswordToken: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  newPassword: string
}
