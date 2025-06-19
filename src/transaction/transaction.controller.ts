import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transaction')
export class TransactionController {

    constructor(private readonly transactionService: TransactionService) { }

    // Define your endpoints here, e.g.:
    @Get()
    async getAllTransactions(@Query() paginationDto: { limit?: number; page?: number }) {
        return this.transactionService.getAllTransactions(paginationDto);
    }   
    
    
    @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(dto);
  }
}
