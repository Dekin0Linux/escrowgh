import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  message: string;
}
