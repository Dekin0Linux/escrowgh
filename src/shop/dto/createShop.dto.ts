import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  shopName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  description: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  location: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  momoNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  owner: string;

  @ApiProperty({
    type: 'string',
    format: 'binary', // 👈 Important for Swagger file input
    required: false,
    description: 'Shop logo or image file',
  })
  @IsOptional()
  file?: any;
}
