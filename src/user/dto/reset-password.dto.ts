import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @IsString()
  @ApiProperty()
  phone: string;

  @IsString()
  @MinLength(6)
  @Matches(/(?=.*[A-Z])/, { message: 'Password must contain an uppercase letter' })
  @Matches(/(?=.*[0-9])/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[!@#$%^&*])/, { message: 'Password must contain a special character' })
  @ApiProperty()
  password: string;
}
