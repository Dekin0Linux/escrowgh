import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  @Matches(/(?=.*[A-Z])/, { message: 'Password must contain an uppercase letter' })
  @Matches(/(?=.*[0-9])/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[!@#$%^&*])/, { message: 'Password must contain a special character' })
  password: string;
}
