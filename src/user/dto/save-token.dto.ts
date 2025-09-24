import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveTokenDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  token: string;
}
