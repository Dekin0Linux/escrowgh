import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty()
  email: string;

  
  @IsString()
  @ApiProperty()
  phone?: string;

  @IsString()
  @MinLength(6)
  @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/(?=.*[0-9])/, { message: 'Password must contain at least one number' })
  @Matches(/(?=.*[!@#$%^&*])/, { message: 'Password must contain at least one special character' })
  @ApiProperty()
  password: string;
}
