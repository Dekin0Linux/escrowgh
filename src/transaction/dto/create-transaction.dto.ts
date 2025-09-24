import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({name:"string"})
    title: string;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    buyerId: string;

    @IsOptional()
    @IsString()
    @ApiProperty()
    sellerId?: string;

    @IsOptional()
    @IsString()
    @ApiProperty()
    sellerMomoNumber?: string;

    @IsOptional()
    @IsString()
    @ApiProperty()
    itemImage?: string;

    @IsOptional()
    @IsString()
    @ApiProperty()
    deliveryNumber?: string;

    @IsOptional()
    @IsNumber()
    @ApiProperty()
    commissionFee?: number;

    @IsNotEmpty()
    @ApiProperty()
    initiatorRole:string

}
