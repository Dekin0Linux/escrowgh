import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    buyerId: string;

    @IsOptional()
    @IsString()
    sellerId?: string;

    @IsOptional()
    @IsString()
    sellerMomoNumber?: string;

    @IsOptional()
    @IsString()
    itemImage?: string;

    @IsOptional()
    @IsString()
    deliveryNumber?: string;

    @IsOptional()
    @IsNumber()
    commissionFee?: number;

}
