import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Body of `PATCH /auth/account/password` (authenticated password change). */
export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The password currently in use, verified before any change.' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The new password. Must satisfy `password.minLength` when configured.' })
  newPassword: string;
}
